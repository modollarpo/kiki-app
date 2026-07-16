const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

const ICONS_DIR = path.join(__dirname, "..", "public", "icons");
const KIKI_PNG = path.join(__dirname, "..", "public", "images", "kiki.png");

// Light glow (not thick). blur ~6, opacity ~0.35
const GLOW_COLOR = "#005CFF";
const GLOW_BLUR = 6;
const GLOW_OPACITY = 0.35;

async function kikiBase64() {
  const buf = await sharp(KIKI_PNG).resize(500, 500).png().toBuffer();
  return buf.toString("base64");
}

// Build master SVG: transparent bg, embed kiki.png with a light glow filter.
function pwaSvg(b64) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <filter id="kikiGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="0" stdDeviation="${GLOW_BLUR}" flood-color="${GLOW_COLOR}" flood-opacity="${GLOW_OPACITY}"/>
    </filter>
  </defs>
  <g transform="translate(56,56) scale(0.78)">
    <image href="data:image/png;base64,${b64}" width="500" height="500" filter="url(#kikiGlow)"/>
  </g>
</svg>`;
}

async function renderSvgToPng(svg, size) {
  return sharp(Buffer.from(svg), { density: 384 })
    .resize(size, size)
    .png()
    .toBuffer();
}

async function main() {
  const b64 = await kikiBase64();
  const svg = pwaSvg(b64);

  // Write master icon.svg (PWA, light glow)
  fs.writeFileSync(path.join(ICONS_DIR, "icon.svg"), svg);

  const sizes = [16, 32, 48, 72, 96, 128, 180, 192, 512];
  for (const s of sizes) {
    const buf = await renderSvgToPng(svg, s);
    fs.writeFileSync(path.join(ICONS_DIR, `icon-${s}.png`), buf);
    console.log(`icon-${s}.png`, buf.length);
  }

  // apple-touch-icon (180) + favicon-style from same source
  const touch = await renderSvgToPng(svg, 180);
  fs.writeFileSync(path.join(ICONS_DIR, "apple-touch-icon.png"), touch);
  console.log("apple-touch-icon.png", touch.length);

  // favicon.svg: web favicon, NO glow (transparent, kiki.png source of truth)
  const favSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <g transform="translate(56,56) scale(0.78)">
    <image href="data:image/png;base64,${b64}" width="500" height="500"/>
  </g>
</svg>`;
  fs.writeFileSync(path.join(ICONS_DIR, "favicon.svg"), favSvg);
  console.log("favicon.svg written");

  // favicon.ico (multi-size) from 16/32/48
  const fav = await sharp(Buffer.from(svg), { density: 384 })
    .png()
    .toBuffer();
  // build ico from 16,32,48 via composite
  const icoSizes = [16, 32, 48];
  const icoBufs = [];
  for (const s of icoSizes) {
    icoBufs.push(await sharp(Buffer.from(svg), { density: 384 }).resize(s, s).png().toBuffer());
  }
  const ico = await sharp(icoBufs[2]).toFormat("png").toBuffer(); // base
  // Use sharp's ico? sharp can't write ico; use first png as favicon fallback already exists.
  console.log("done");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
