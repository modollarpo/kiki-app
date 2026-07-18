import os, subprocess, json

d = r"C:\kiki-app\public\demo\voiceover"
for f in sorted(os.listdir(d)):
    if not f.endswith(".mp3"):
        continue
    fp = os.path.join(d, f)
    try:
        out = subprocess.check_output(
            ["ffprobe", "-v", "error", "-show_entries", "format=duration",
             "-of", "json", fp]
        )
        dur = json.loads(out)["format"]["duration"]
        print(f"{f}: {float(dur):.2f}s")
    except Exception as e:
        print(f"{f}: ERROR {e}")
