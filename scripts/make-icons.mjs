// Builds the in-app logo and every icon from design/almas-logo.jpg (macOS: uses sips for decoding/resizing).
//   node scripts/make-icons.mjs
// The logo is drawn on black; the black that touches the image border is made transparent so it sits on any
// background, while the black outlines inside the artwork stay. Icons are composited on the app background.
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { deflateSync, inflateSync } from "node:zlib";

const SRC = "design/almas-logo.jpg";
const BG = [10, 22, 49]; // keep in sync with --bg in src/app/globals.css (#0a1631)
const BLACK_MAX = 60; // brightest channel that still counts as background black

const tmp = mkdtempSync(join(tmpdir(), "almas-"));
const sips = (...args) => execFileSync("sips", args, { stdio: "ignore" });

function decodePng(buf) {
  let pos = 8;
  let width = 0;
  let height = 0;
  let colorType = 0;
  const idat = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString("ascii", pos + 4, pos + 8);
    const data = buf.subarray(pos + 8, pos + 8 + len);
    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      colorType = data[9];
      if (data[8] !== 8 || data[12] !== 0) throw new Error("expected 8-bit, non-interlaced PNG");
    } else if (type === "IDAT") idat.push(data);
    pos += 12 + len;
  }
  const bpp = colorType === 6 ? 4 : colorType === 2 ? 3 : 0;
  if (!bpp) throw new Error(`unsupported PNG color type ${colorType}`);
  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * bpp;
  const out = Buffer.alloc(width * height * 4);
  let prev = Buffer.alloc(stride);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    const cur = Buffer.alloc(stride);
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? cur[x - bpp] : 0;
      const b = prev[x];
      const c = x >= bpp ? prev[x - bpp] : 0;
      let v = line[x];
      if (filter === 1) v += a;
      else if (filter === 2) v += b;
      else if (filter === 3) v += (a + b) >> 1;
      else if (filter === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - b);
        const pc = Math.abs(p - c);
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      cur[x] = v & 255;
    }
    for (let x = 0; x < width; x++) {
      const o = (y * width + x) * 4;
      out[o] = cur[x * bpp];
      out[o + 1] = cur[x * bpp + 1];
      out[o + 2] = cur[x * bpp + 2];
      out[o + 3] = bpp === 4 ? cur[x * bpp + 3] : 255;
    }
    prev = cur;
  }
  return { width, height, data: out };
}

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
};

function encodePng({ width, height, data }, alpha = true) {
  const ch = alpha ? 4 : 3;
  const raw = Buffer.alloc((width * ch + 1) * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const s = (y * width + x) * 4;
      const o = y * (width * ch + 1) + 1 + x * ch;
      raw[o] = data[s];
      raw[o + 1] = data[s + 1];
      raw[o + 2] = data[s + 2];
      if (alpha) raw[o + 3] = data[s + 3];
    }
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = alpha ? 6 : 2;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// 1. JPEG -> PNG -> pixels.
sips("-s", "format", "png", SRC, "--out", join(tmp, "full.png"));
const img = decodePng(readFileSync(join(tmp, "full.png")));
const { width: W, height: H, data } = img;
const bright = (i) => Math.max(data[i * 4], data[i * 4 + 1], data[i * 4 + 2]);

// 2. Flood-fill the background from the border; only black reachable from outside becomes transparent.
const outside = new Uint8Array(W * H);
const stack = [];
const push = (x, y) => {
  const i = y * W + x;
  if (!outside[i] && bright(i) < BLACK_MAX) {
    outside[i] = 1;
    stack.push(i);
  }
};
for (let x = 0; x < W; x++) {
  push(x, 0);
  push(x, H - 1);
}
for (let y = 0; y < H; y++) {
  push(0, y);
  push(W - 1, y);
}
while (stack.length) {
  const i = stack.pop();
  const x = i % W;
  const y = (i - x) / W;
  if (x > 0) push(x - 1, y);
  if (x < W - 1) push(x + 1, y);
  if (y > 0) push(x, y - 1);
  if (y < H - 1) push(x, y + 1);
}

// 3. Alpha: outside = 0; a soft edge on the first pixels touching it to avoid a dark halo.
let minX = W;
let minY = H;
let maxX = 0;
let maxY = 0;
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const i = y * W + x;
    let a = 255;
    if (outside[i]) a = 0;
    else {
      const edge =
        (x > 0 && outside[i - 1]) || (x < W - 1 && outside[i + 1]) || (y > 0 && outside[i - W]) || (y < H - 1 && outside[i + W]);
      if (edge) a = Math.min(255, Math.max(0, ((bright(i) - BLACK_MAX) / 90) * 255));
    }
    data[i * 4 + 3] = a;
    if (a > 0) {
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
  }
}

// 4. Crop to the artwork and write the in-app logo.
const cw = maxX - minX + 1;
const ch = maxY - minY + 1;
const crop = Buffer.alloc(cw * ch * 4);
for (let y = 0; y < ch; y++) data.copy(crop, y * cw * 4, ((minY + y) * W + minX) * 4, ((minY + y) * W + minX + cw) * 4);
const logo = { width: cw, height: ch, data: crop };
mkdirSync("src/assets", { recursive: true });
writeFileSync("src/assets/logo.png", encodePng(logo));

// 5. Icons: logo scaled to ~78% of the width, centred on the app background.
function icon(size, out) {
  const w = Math.round(size * 0.78);
  sips("--resampleWidth", String(w), "src/assets/logo.png", "--out", join(tmp, `logo-${size}.png`));
  const small = decodePng(readFileSync(join(tmp, `logo-${size}.png`)));
  const canvas = Buffer.alloc(size * size * 4);
  for (let i = 0; i < size * size; i++) {
    canvas[i * 4] = BG[0];
    canvas[i * 4 + 1] = BG[1];
    canvas[i * 4 + 2] = BG[2];
    canvas[i * 4 + 3] = 255;
  }
  const ox = Math.round((size - small.width) / 2);
  const oy = Math.round((size - small.height) / 2);
  for (let y = 0; y < small.height; y++) {
    for (let x = 0; x < small.width; x++) {
      const s = (y * small.width + x) * 4;
      const d = ((y + oy) * size + x + ox) * 4;
      const a = small.data[s + 3] / 255;
      for (let c = 0; c < 3; c++) canvas[d + c] = Math.round(small.data[s + c] * a + canvas[d + c] * (1 - a));
    }
  }
  writeFileSync(out, encodePng({ width: size, height: size, data: canvas }, false));
}
mkdirSync("public/icons", { recursive: true });
icon(180, "public/apple-touch-icon.png");
icon(192, "public/icons/icon-192.png");
icon(512, "public/icons/icon-512.png");

rmSync(tmp, { recursive: true, force: true });
console.log(`logo ${cw}x${ch}, icons written`);
