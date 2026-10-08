const fs = require("fs");
const path = require("path");
const https = require("https");

const ENDPOINT = process.env.AZURE_OPENAI_ENDPOINT;
const API_KEY = process.env.AZURE_OPENAI_API_KEY;
const API_VERSION = "2024-10-21";

// Voiceover lines matched to scene timing (seconds)
const SCENES = [
  { name: "problem",  seconds: 7,  text: "Manual bidding. Scattered data. Zero visibility. Wasted spend, missed conversions. Your competitors are already using AI. Are you?" },
  { name: "logo",     seconds: 4,  text: "Introducing KIKI Agent." },
  { name: "dashboard", seconds: 15, text: "KIKI Agent unifies your entire ad pipeline into one intelligent dashboard. Real-time signals from Meta, Google, TikTok, LinkedIn, Snapchat, and Pinterest. One view. One system. Total control." },
  { name: "agents",   seconds: 10, text: "Six autonomous AI agents work around the clock. Bidding. Creative. Smart Pacing. Signals. OaaS. SyncBrain. Each one specialized. All one team." },
  { name: "results",  seconds: 10, text: "Every conversion enriched in under fifty milliseconds. Twenty-eight signal features. A ninety-day lifetime value prediction, delivered to every connected platform." },
  { name: "cta",      seconds: 6,  text: "Start your free trial today. No credit card required. KIKI Agent. Built for performance." },
  { name: "hold",     seconds: 8,  text: "KIKI dot net. Your autonomous growth platform." },
];

function ttsRequest(text, voice = "onyx") {
  return new Promise((resolve, reject) => {
    // Azure OpenAI TTS via deployments endpoint
    const deployment = "tts-1-hd";
    const url = new URL(
      `${ENDPOINT}openai/deployments/${deployment}/audio/speech?api-version=${API_VERSION}`
    );

    const body = JSON.stringify({
      model: deployment,
      input: text,
      voice: voice,
      response_format: "mp3",
      speed: 1.0,
    });

    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname + url.search,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": API_KEY,
        "Content-Length": Buffer.byteLength(body),
      },
    };

    const req = https.request(options, (res) => {
      if (res.statusCode !== 200) {
        let errBody = "";
        res.on("data", (d) => (errBody += d));
        res.on("end", () =>
          reject(new Error(`TTS ${res.statusCode}: ${errBody}`))
        );
        return;
      }
      const chunks = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => resolve(Buffer.concat(chunks)));
    });

    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

async function main() {
  const outDir = path.join(__dirname, "public", "demo", "voiceover");
  fs.mkdirSync(outDir, { recursive: true });

  for (const scene of SCENES) {
    const outFile = path.join(outDir, `${scene.name}.mp3`);
    if (fs.existsSync(outFile)) {
      console.log(`Skipping ${scene.name} (exists)`);
      continue;
    }
    console.log(`Generating: ${scene.name} (${scene.seconds}s) ...`);
    try {
      const buf = await ttsRequest(scene.text);
      fs.writeFileSync(outFile, buf);
      console.log(`  -> ${scene.name}.mp3 (${(buf.length / 1024).toFixed(0)} KB)`);
    } catch (err) {
      console.error(`  FAILED ${scene.name}: ${err.message}`);
    }
  }

  // Concatenate all into full voiceover
  const fullOut = path.join(outDir, "full-voiceover.mp3");
  const buffers = [];
  for (const scene of SCENES) {
    const f = path.join(outDir, `${scene.name}.mp3`);
    if (fs.existsSync(f)) buffers.push(fs.readFileSync(f));
  }
  if (buffers.length === SCENES.length) {
    fs.writeFileSync(fullOut, Buffer.concat(buffers));
    const size = fs.statSync(fullOut).size;
    console.log(`\nFull voiceover: ${fullOut} (${(size / 1024 / 1024).toFixed(1)} MB)`);
  } else {
    console.log(`\nOnly ${buffers.length}/${SCENES.length} scenes generated. Skipping concat.`);
  }
}

main().catch(console.error);
