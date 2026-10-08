const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

const SVG = "public/icons/favicon.svg";
const MASKABLE_SVG = "public/icons/icon-maskable.svg";
const OUT = "public/icons";
const BG = { r: 10, g: 10, b: 11, alpha: 1 };

const faviconSizes = [16, 32, 48];
const maskableSizes = [72, 96, 128, 180, 192, 512, 1024];

async function renderPng(size, filename, { transparent = false, maskable = false } = {}) {
  const src = maskable ? MASKABLE_SVG : SVG;
  const canvas = sharp({
    create: { width: size, height: size, channels: 4, background: transparent ? { r: 0, g: 0, b: 0, alpha: 0 } : BG },
  });
  const art = await sharp(src).resize(size, size, { fit: "fill" }).png().toBuffer();
  await canvas
    .composite([{ input: art, left: 0, top: 0 }])
    .png()
    .toFile(path.join(OUT, filename));
  console.log("wrote", filename);
}

function writeFaviconIco() {
  const pngs = faviconSizes.map((s) => fs.readFileSync(path.join(OUT, `icon-${s}.png`)));
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); header.writeUInt16LE(1, 2); header.writeUInt16LE(pngs.length, 4);
  const entries = Buffer.alloc(pngs.length * 16);
  let offset = 6 + pngs.length * 16;
  pngs.forEach((p, i) => {
    const dim = faviconSizes[i];
    entries.writeUInt8(dim, i * 16); entries.writeUInt8(dim, i * 16 + 1);
    entries.writeUInt8(0, i * 16 + 2); entries.writeUInt8(0, i * 16 + 3);
    entries.writeUInt16LE(1, i * 16 + 4); entries.writeUInt16LE(32, i * 16 + 6);
    entries.writeUInt32LE(p.length, i * 16 + 8); entries.writeUInt32LE(offset, i * 16 + 12);
    offset += p.length;
  });
  fs.writeFileSync(path.join(OUT, "favicon.ico"), Buffer.concat([header, entries, ...pngs]));
  console.log("wrote favicon.ico (vector)");
}

function writeFaviconSvg() {
  const art = sharp(SVG).resize(32, 32, { fit: "fill" }).png().toBuffer();
  const b64 = art.toString("base64");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">\n  <image href="data:image/png;base64,${b64}" width="32" height="32"/>\n</svg>`;
  fs.writeFileSync(path.join(OUT, "favicon.svg"), svg);
  console.log("wrote favicon.svg (rasterized true logo)");
}

async function renderAppleTouch() {
  const size = 180;
  const tileScale = Math.round(size * 0.82);
  const art = await sharp(SRC).resize(tileScale, tileScale, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
  await sharp({ create: { width: size, height: size, channels: 4, background: BG } })
    .composite([{ input: art, left: Math.round((size - tileScale) / 2), top: Math.round((size - tileScale) / 2) }])
    .png()
    .toFile(path.join(OUT, "apple-touch-icon.png"));
  console.log("wrote apple-touch-icon.png");
}

async function renderSplash() {
  const splashSizes = [
    { name: "splash-narrow", w: 1290, h: 2796 },
    { name: "splash-wide", w: 2048, h: 2732 },
  };
  for (const s of splashSizes) {
    const iconSize = Math.round(Math.min(s.w, s.h) * 0.42);
    const art = await sharp(MASKABLE_SVG).resize(iconSize, iconSize, { fit: "fill" }).png().toBuffer();
    await sharp({ create: { width: s.w, height: s.h, channels: 4, background: BG } })
      .composite([{ input: art, top: Math.round((s.h - iconSize) / 2), left: Math.round((s.w - iconSize) / 2) }])
      .png()
      .toFile(path.join(OUT, `${s.name}.png`));
    console.log("wrote", `${s.name}.png`);
  }
}

(async () => {
  for (const s of faviconSizes) {
    await renderPng(s, `icon-${s}.png`, { transparent: true });
  }
  await writeFaviconSvg();
  writeFaviconIco();
  for (const s of maskableSizes) {
    const name = s === 180 ? "apple-touch-icon.png" : `icon-${s}.png`;
    await renderPng(s, name, { maskable: true });
  }
  await renderSplash();
  console.log("\nAll icons written (vector source).");
}).catch((e) => { console.error(e); process.exit(1); });