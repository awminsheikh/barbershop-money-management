// Prints the two starting accounts (admin and owner) as JSON with salted hashes, never the passwords.
// The deploy workflow stores the output in NEXT_PUBLIC_SEED_ACCOUNTS so every phone that opens the app already
// has both accounts and goes straight to the login screen. Same algorithm as src/lib/hash.ts.
//
//   ADMIN_USERNAME=... ADMIN_PASSWORD=... OWNER_USERNAME=... OWNER_PASSWORD=... node scripts/seed-accounts.mjs
//
// With none of the four set it prints nothing and the app falls back to its first-run setup screen.
import { createHash } from "node:crypto";

const ITERATIONS = 50_000;
const env = process.env;
const names = ["ADMIN_USERNAME", "ADMIN_PASSWORD", "OWNER_USERNAME", "OWNER_PASSWORD"];
const set = names.filter((n) => env[n]);
if (set.length === 0) process.exit(0);
if (set.length < names.length) {
  console.error(`Set all four of ${names.join(", ")} (missing: ${names.filter((n) => !env[n]).join(", ")}).`);
  process.exit(1);
}

const hash = (password, salt) => {
  const pw = Buffer.from(password);
  const s = Buffer.from(salt);
  let digest = createHash("sha256").update(Buffer.concat([s, pw])).digest();
  for (let i = 1; i < ITERATIONS; i++) digest = createHash("sha256").update(Buffer.concat([digest, pw, s])).digest();
  return digest.toString("hex");
};

const account = (role, username, password) => {
  const name = username.trim().toLowerCase();
  if (name.length < 3 || /\s/.test(name)) throw new Error(`${role} username must be 3+ characters without spaces.`);
  if (password.length < 6) throw new Error(`${role} password must be at least 6 characters.`);
  // Same login always gives the same salt (and so the same hash), so a rebuild with unchanged secrets does not
  // look like new accounts to phones. Only changing a username or password changes what the phones see.
  const salt = createHash("sha256").update(`almas|${role}|${name}`).digest("hex").slice(0, 32);
  return { username: name, role, salt, hash: hash(password, salt), iterations: ITERATIONS, createdAt: Date.now() };
};

try {
  const accounts = [account("admin", env.ADMIN_USERNAME, env.ADMIN_PASSWORD), account("owner", env.OWNER_USERNAME, env.OWNER_PASSWORD)];
  if (accounts[0].username === accounts[1].username) throw new Error("Admin and owner usernames must differ.");
  process.stdout.write(JSON.stringify(accounts));
} catch (e) {
  console.error(e.message);
  process.exit(1);
}
