import asyncio
import edge_tts
import os

VOICE = "en-US-AndrewNeural"
OUT_DIR = os.path.join(os.path.dirname(__file__), "public", "demo", "voiceover")
os.makedirs(OUT_DIR, exist_ok=True)

# Scene scripts matched to timing (seconds available for each scene)
SCENES = [
    ("problem", 7, "Manual bidding. Scattered data. Zero visibility. Wasted spend, missed conversions. Your competitors are already using AI. Are you?"),
    ("logo", 4, "Introducing KIKI Agent."),
    ("dashboard", 15, "KIKI Agent unifies your entire ad pipeline into one intelligent dashboard. Real-time signals from Meta, Google, TikTok, LinkedIn, Snapchat, and Pinterest. One view. One system. Total control."),
    ("agents", 10, "Six autonomous AI agents work around the clock. Bidding. Creative. Smart Pacing. Signals. OaaS. SyncBrain. Each one specialized. All one team."),
    ("results", 10, "Every conversion enriched in under fifty milliseconds. Twenty-eight signal features. A ninety-day lifetime value prediction, delivered to every connected platform."),
    ("cta", 6, "Start your free trial today. No credit card required. KIKI Agent. Built for performance."),
    ("hold", 8, "KIKI dot net. Your autonomous growth platform."),
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
