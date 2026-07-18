const { execSync } = require("child_process");
const path = require("path");

const outDir = path.resolve(__dirname, "..", "..", "public", "demo");
const entryPoint = path.resolve(__dirname, "src", "index.ts");

console.log("Rendering KIKI Demo Video...");
console.log(`Output: ${outDir}/kiki-demo.mp4`);

execSync(
  `npx remotion render src/index.ts KIKIDemo "${outDir}\\kiki-demo.mp4" --codec h264 --concurrency 2`,
  {
    cwd: __dirname,
    stdio: "inherit",
    env: { ...process.env, NODE_OPTIONS: "--max-old-space-size=4096" },
  }
);

console.log("Done! Video rendered successfully.");
