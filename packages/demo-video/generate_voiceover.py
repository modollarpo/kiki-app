import asyncio
import edge_tts
import os

VOICE = "en-US-AndrewNeural"
OUT_DIR = os.path.join(os.path.dirname(__file__), "public", "demo", "voiceover")
os.makedirs(OUT_DIR, exist_ok=True)

# Scene scripts matched to timing (seconds available for each scene)
SCENES = [
    ("problem", 7, "Sixty-five percent of ad spend is wasted. Manual bidding, scattered data, zero visibility. Your competitors are already using AI. Are you?"),
    ("logo", 4, "Introducing KIKI Agent."),
    ("dashboard", 15, "KIKI Agent unifies your entire ad pipeline into one intelligent dashboard. Real-time signals from Meta, Google, TikTok, LinkedIn, Snapchat, and Pinterest. One view. One system. Total control."),
    ("agents", 10, "Six autonomous AI agents work around the clock. Bid Optimizer. Creative Analyst. Budget Guardian. Signal Scanner. LTV Predictor. Fraud Detector. Each one specialized. All one team."),
    ("results", 10, "The results speak for themselves. Three point two X return on ad spend. Forty-one percent lower cost per acquisition. Two point eight X customer lifetime value. From day one."),
    ("cta", 6, "Start your free trial today. No credit card required. KIKI Agent. Built in England. Built for performance."),
    ("hold", 8, "KIKI Agent dot net. Your autonomous growth platform."),
]

async def generate_scene(name, text):
    out = os.path.join(OUT_DIR, f"{name}.mp3")
    if os.path.exists(out):
        print(f"  Skipping {name} (exists)")
        return
    communicate = edge_tts.Communicate(text, VOICE, rate="-5%")
    await communicate.save(out)
    size = os.path.getsize(out)
    print(f"  {name}.mp3 -> {size // 1024} KB")

async def main():
    for name, secs, text in SCENES:
        print(f"Generating: {name} ({secs}s) ...")
        await generate_scene(name, text)
    print("\nDone! All scenes generated.")

if __name__ == "__main__":
    asyncio.run(main())
