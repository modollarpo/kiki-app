const sharp = require("sharp");
const path = require("path");
const fs = require("fs");

const ICON_SVG = path.join(__dirname, "..", "public", "icons", "icon.svg");
const FAVICON_SVG = path.join(__dirname, "..", "public", "icons", "favicon.svg");
const OUT_DIR = path.join(__dirname, "..", "public", "icons");

const SIZES = [16, 32, 48, 72, 96, 128, 180, 192, 512];

async function generate() {
  if (!fs.existsSync(ICON_SVG)) {
    console.error("icon.svg not found at", ICON_SVG);
    process.exit(1);
  }

  const iconSvg = fs.readFileSync(ICON_SVG);
  const faviconSvg = fs.readFileSync(FAVICON_SVG);

  for (const size of SIZES) {
    const outPath = path.join(OUT_DIR, `icon-${size}.png`);
    await sharp(iconSvg)
      .resize(size, size)
      .png()
      .toFile(outPath);
    console.log(`Generated ${outPath}`);
  }

  // Apple touch icon (180x180 from favicon SVG)
  const applePath = path.join(OUT_DIR, "apple-touch-icon.png");
  await sharp(faviconSvg)
    .resize(180, 180)
    .png()
    .toFile(applePath);
  console.log(`Generated ${applePath}`);

  // Favicon ICO (multi-size: 16, 32, 48)
  const faviconIco = path.join(OUT_DIR, "favicon.ico");
  const sizes16 = await sharp(faviconSvg).resize(16, 16).png().toBuffer();
  const sizes32 = await sharp(faviconSvg).resize(32, 32).png().toBuffer();
  const sizes48 = await sharp(iconSvg).resize(48, 48).png().toBuffer();

  // ICO format: header + directory entries + PNG data
  const pngBuffers = [
    { size: 16, data: sizes16 },
    { size: 32, data: sizes32 },
    { size: 48, data: sizes48 },
  ];

  const headerLen = 6;
  const dirEntryLen = 16;
  const dirLen = dirEntryLen * pngBuffers.length;
  const dataOffset = headerLen + dirLen;

  let totalLen = dataOffset;
  for (const buf of pngBuffers) totalLen += buf.data.length;

  const ico = Buffer.alloc(totalLen);
  // ICO header
  ico.writeUInt16LE(0, 0); // reserved
  ico.writeUInt16LE(1, 2); // type: icon
  ico.writeUInt16LE(pngBuffers.length, 4); // image count

  let dataPtr = dataOffset;
  for (let i = 0; i < pngBuffers.length; i++) {
    const buf = pngBuffers[i];
    const dirOffset = headerLen + i * dirEntryLen;
    ico.writeUInt8(buf.size < 256 ? buf.size : 0, dirOffset + 0); // width
    ico.writeUInt8(buf.size < 256 ? buf.size : 0, dirOffset + 1); // height
    ico.writeUInt8(0, dirOffset + 2);  // color palette
    ico.writeUInt8(0, dirOffset + 3);  // reserved
    ico.writeUInt16LE(1, dirOffset + 4);  // color planes
    ico.writeUInt16LE(32, dirOffset + 6); // bits per pixel
    ico.writeUInt32LE(buf.data.length, dirOffset + 8);  // data size
    ico.writeUInt32LE(dataPtr, dirOffset + 12); // data offset
    buf.data.copy(ico, dataPtr);
    dataPtr += buf.data.length;
  }

  fs.writeFileSync(faviconIco, ico);
  console.log(`Generated ${faviconIco}`);
  console.log("Done!");
}

generate().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
