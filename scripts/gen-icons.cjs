const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

const SRC = "public/images/kiki.png";
const OUT = "public/icons";
const sizes = [16, 32, 48, 72, 96, 128, 180, 192, 512];

async function render(size, filename) {
  const glowScale = Math.max(2, Math.round(size * 0.72));
  const blurPx = Math.max(1, Math.round(size * 0.10));
  const glow = await sharp(SRC)
    .resize(glowScale, glowScale, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .tint({ r: 0, g: 92, b: 255 })
    .modulate({ brightness: 1.15 })
    .blur(blurPx)
    .toBuffer();

  const tileScale = Math.max(1, Math.round(size * 0.54));
  const tile = await sharp(SRC)
    .resize(tileScale, tileScale, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();

  const gx = Math.round((size - glowScale) / 2);
  const gy = Math.round((size - glowScale) / 2);
  const tx = Math.round((size - tileScale) / 2);
  const ty = Math.round((size - tileScale) / 2);

  await sharp({
    create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([
      { input: glow, left: gx, top: gy },
      { input: tile, left: tx, top: ty },
    ])
    .png()
    .toFile(path.join(OUT, filename));
  console.log("wrote", filename);
}

(async () => {
  for (const s of sizes) {
    const name = s === 180 ? "apple-touch-icon.png" : `icon-${s}.png`;
    await render(s, name);
  }
  const pngs = [16, 32, 48].map((s) => fs.readFileSync(path.join(OUT, `icon-${s}.png`)));
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); header.writeUInt16LE(1, 2); header.writeUInt16LE(pngs.length, 4);
  const entries = Buffer.alloc(pngs.length * 16);
  let offset = 6 + pngs.length * 16;
  pngs.forEach((p, i) => {
    const dim = i === 0 ? 16 : i === 1 ? 32 : 48;
    entries.writeUInt8(dim, i * 16); entries.writeUInt8(dim, i * 16 + 1);
    entries.writeUInt8(0, i * 16 + 2); entries.writeUInt8(0, i * 16 + 3);
    entries.writeUInt16LE(1, i * 16 + 4); entries.writeUInt16LE(32, i * 16 + 6);
    entries.writeUInt32LE(p.length, i * 16 + 8); entries.writeUInt32LE(offset, i * 16 + 12);
    offset += p.length;
  });
  fs.writeFileSync(path.join(OUT, "favicon.ico"), Buffer.concat([header, entries, ...pngs]));
  console.log("wrote favicon.ico");
})();
