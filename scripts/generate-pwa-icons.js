/**
 * Generates icon-192.png and icon-512.png in public/ for PWA installability.
 * Run: node scripts/generate-pwa-icons.js
 * Requires: npm install pngjs (dev)
 */
const fs = require("fs");
const path = require("path");
const PNG = require("pngjs").PNG;

const PUBLIC = path.join(__dirname, "..", "public");
const TEAL = { r: 13, g: 148, b: 136 }; // #0d9488 theme

function createIcon(size) {
  const png = new PNG({ width: size, height: size });
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (size * y + x) << 2;
      png.data[i] = TEAL.r;
      png.data[i + 1] = TEAL.g;
      png.data[i + 2] = TEAL.b;
      png.data[i + 3] = 255;
    }
  }
  return png;
}

if (!fs.existsSync(PUBLIC)) fs.mkdirSync(PUBLIC, { recursive: true });

[192, 512].forEach((size) => {
  const out = path.join(PUBLIC, `icon-${size}.png`);
  createIcon(size)
    .pack()
    .pipe(fs.createWriteStream(out))
    .on("finish", () => console.log("Written", out));
});
