import asyncio
import edge_tts
import os

VOICE = "en-US-AndrewNeural"
OUT_DIR = os.path.join(os.path.dirname(__file__), "public", "demo", "voiceover")
os.makedirs(OUT_DIR, exist_ok=True)

# Scene scripts matched to timing (seconds available for each scene).
# Each line must finish comfortably inside its slot so voiceovers never overlap.
# rate is tuned so the generated MP3 fits within ~90% of the scene duration.
SCENES = [
    ("problem", 7, "Manual bidding wastes budget. Bots, fatigue, no visibility. Competitors use AI. Are you?", "+12%"),
    ("logo", 4, "Introducing KIKI Agent.", "-0%"),
    ("dashboard", 15, "KIKI Agent unifies your entire ad pipeline into one intelligent dashboard. Real-time signals from Meta, Google, TikTok, LinkedIn, Snapchat, and Pinterest. One view. One system. Total control.", "+12%"),
    ("agents", 10, "Six autonomous AI agents. Bidding. Creative. Smart Pacing. Signals. OaaS. SyncBrain. Specialists. One team.", "+12%"),
    ("results", 10, "Every conversion enriched in under fifty milliseconds. Twenty-eight signal features. A ninety-day lifetime value prediction, delivered to every connected platform.", "+25%"),
    ("cta", 6, "Start your free trial today. No credit card required. KIKI Agent. Built for performance.", "+18%"),
    ("hold", 8, "KIKI dot net. Your autonomous growth platform.", "-0%"),
]

async def generate_scene(name, text, rate):
    out = os.path.join(OUT_DIR, f"{name}.mp3")
    if os.path.exists(out):
        print(f"  Skipping {name} (exists)")
        return
    communicate = edge_tts.Communicate(text, VOICE, rate=rate)
    await communicate.save(out)
    size = os.path.getsize(out)
    print(f"  {name}.mp3 -> {size // 1024} KB")

async def main():
    for name, secs, text, rate in SCENES:
        print(f"Generating: {name} ({secs}s) ...")
        await generate_scene(name, text, rate)
    print("\nDone! All scenes generated.")

if __name__ == "__main__":
    asyncio.run(main())
