#!/bin/sh
# Builds every icon from design/almas-logo.jpg using macOS sips. Run from the project root.
set -e
SRC=design/almas-logo.jpg
TMP=$(mktemp -d)

# Tight crop of the diamond (the source is a 720x1280 phone image with black margins).
sips -s format png -c 610 720 --cropOffset 330 0 "$SRC" --out "$TMP/logo.png" >/dev/null
cp "$TMP/logo.png" src/assets/logo.png

# Square icon: logo centred on black with breathing room.
sips --padToHeightWidth 900 900 --padColor 000000 "$TMP/logo.png" --out "$TMP/square.png" >/dev/null
mkdir -p public/icons
sips -z 180 180 "$TMP/square.png" --out public/apple-touch-icon.png >/dev/null
sips -z 192 192 "$TMP/square.png" --out public/icons/icon-192.png >/dev/null
sips -z 512 512 "$TMP/square.png" --out public/icons/icon-512.png >/dev/null
rm -rf "$TMP"
echo "icons written"
