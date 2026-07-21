import sharp from "sharp";
import fs from "fs";
import path from "path";

const svgPath = path.resolve("public/icons/icon.svg");
const outDir = path.resolve("public/icons");

const sizes = [16, 32, 48, 72, 96, 128, 180, 192, 512];

async function main() {
  const svgBuffer = fs.readFileSync(svgPath);

  for (const size of sizes) {
    const outPath = path.join(outDir, `icon-${size}.png`);
    await sharp(svgBuffer).resize(size, size).png().toFile(outPath);
    const stat = fs.statSync(outPath);
    console.log(`Generated icon-${size}.png (${size}x${size}, ${stat.size} bytes)`);
  }

  // apple-touch-icon = 180x180
  const applePath = path.join(outDir, "apple-touch-icon.png");
  await sharp(svgBuffer).resize(180, 180).png().toFile(applePath);
  const astat = fs.statSync(applePath);
  console.log(`Generated apple-touch-icon.png (180x180, ${astat.size} bytes)`);

  // Generate 1024x1024 for splash screen compositing and maskable
  const bigPath = path.join(outDir, "icon-1024.png");
  await sharp(svgBuffer).resize(1024, 1024).png().toFile(bigPath);
  const bstat = fs.statSync(bigPath);
  console.log(`Generated icon-1024.png (1024x1024, ${bstat.size} bytes)`);

  // Generate splash screen images
  // iOS narrow (portrait phone): 1290x2796 (iPhone 14 Pro Max)
  // iOS wide (portrait tablet): 2048x2732 (iPad Pro 12.9")
  // Android: 1242x2688, 2048x2732

  const bgColor = { r: 10, g: 10, b: 11, alpha: 1 };

  const splashSizes = [
    { name: "splash-narrow", w: 1290, h: 2796 },  // iPhone narrow
    { name: "splash-wide", w: 2048, h: 2732 },     // iPad wide
  ];

  // Load the icon as a composite overlay
  const iconBuffer = await sharp(svgBuffer).resize(512, 512).png().toBuffer();

  for (const s of splashSizes) {
    const outPath = path.join(outDir, `${s.name}.png`);
    const iconSize = Math.round(Math.min(s.w, s.h) * 0.38);
    const iconResized = await sharp(svgBuffer).resize(iconSize, iconSize).png().toBuffer();

    await sharp({
      create: {
        width: s.w,
        height: s.h,
        channels: 4,
        background: bgColor,
      },
    })
      .composite([
        {
          input: iconResized,
          top: Math.round((s.h - iconSize) / 2),
          left: Math.round((s.w - iconSize) / 2),
        },
      ])
      .png()
      .toFile(outPath);
    const stat = fs.statSync(outPath);
    console.log(`Generated ${s.name}.png (${s.w}x${s.h}, ${stat.size} bytes)`);
  }

  console.log("\nAll icons and splash screens generated successfully!");
}

main().catch(console.error);
