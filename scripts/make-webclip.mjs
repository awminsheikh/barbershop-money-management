// Generates an iPhone Web Clip profile that puts the deployed app on the Home Screen.
// Usage: node scripts/make-webclip.mjs https://yourname.github.io/barbershop/
import { randomUUID } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";

const url = process.argv[2];
if (!url?.startsWith("https://")) {
  console.error("Usage: node scripts/make-webclip.mjs https://yourname.github.io/barbershop/");
  process.exit(1);
}

const icon = readFileSync("public/apple-touch-icon.png").toString("base64");
const plist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>PayloadContent</key>
  <array>
    <dict>
      <key>FullScreen</key><true/>
      <key>IsRemovable</key><true/>
      <key>Label</key><string>آرایشگاه</string>
      <key>PayloadDescription</key><string>Adds the barbershop app to the Home Screen</string>
      <key>PayloadDisplayName</key><string>Web Clip</string>
      <key>PayloadIdentifier</key><string>com.barbershop.webclip.app</string>
      <key>PayloadType</key><string>com.apple.webClip.managed</string>
      <key>PayloadUUID</key><string>${randomUUID().toUpperCase()}</string>
      <key>PayloadVersion</key><integer>1</integer>
      <key>Precomposed</key><true/>
      <key>URL</key><string>${url}</string>
      <key>Icon</key><data>${icon}</data>
    </dict>
  </array>
  <key>PayloadDisplayName</key><string>مدیریت آرایشگاه</string>
  <key>PayloadIdentifier</key><string>com.barbershop.profile</string>
  <key>PayloadRemovalDisallowed</key><false/>
  <key>PayloadType</key><string>Configuration</string>
  <key>PayloadUUID</key><string>${randomUUID().toUpperCase()}</string>
  <key>PayloadVersion</key><integer>1</integer>
</dict>
</plist>
`;
writeFileSync("barbershop.mobileconfig", plist);
console.log("wrote barbershop.mobileconfig for", url);
