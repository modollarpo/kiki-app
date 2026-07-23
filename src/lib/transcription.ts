import { logger } from "./logger";
import { withRetry } from "./retry";

const AZURE_SPEECH_ENDPOINT = process.env.AZURE_SPEECH_ENDPOINT || "";
const AZURE_SPEECH_KEY = process.env.AZURE_SPEECH_KEY || "";
const AZURE_SPEECH_REGION = process.env.AZURE_SPEECH_REGION || "swedencentral";

interface TranscriptionResult {
  text: string;
  confidence: number;
  durationMs: number;
  source: "groq" | "azure" | "none";
}

async function transcribeGroq(audioBase64: string, format: string): Promise<TranscriptionResult | null> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;

  const contentType = format === "webm" ? "audio/webm" : format === "mp3" ? "audio/mpeg" : "audio/wav";

  try {
    return await withRetry(async () => {
      const blob = Buffer.from(audioBase64, "base64");
      const form = new FormData();
      form.append("file", new Blob([blob], { type: contentType }), `audio.${format || "wav"}`);
      form.append("model", "whisper-large-v3");
      form.append("response_format", "json");

      const res = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}` },
        body: form,
        signal: AbortSignal.timeout(15000),
      });

      if (!res.ok) {
        logger.warn("Groq Whisper API error", { status: res.status });
        return null;
      }

      const data = await res.json();
      return {
        text: data.text || "",
        confidence: 0.95,
        durationMs: data.duration ? data.duration * 1000 : 0,
        source: "groq",
      };
    }, { maxRetries: 1, baseDelayMs: 500 });
  } catch (e) {
    logger.warn("Groq Whisper failed", { error: (e as Error).message });
    return null;
  }
}

async function transcribeAzure(audioBase64: string, format: string): Promise<TranscriptionResult | null> {
  if (!AZURE_SPEECH_KEY) return null;

  try {
    const tokenUrl = `https://${AZURE_SPEECH_REGION}.api.cognitive.microsoft.com/sts/v1.0/issueToken`;
    const tokenRes = await fetch(tokenUrl, {
      method: "POST",
      headers: { "Ocp-Apim-Subscription-Key": AZURE_SPEECH_KEY },
      signal: AbortSignal.timeout(5000),
    });
    if (!tokenRes.ok) return null;
    const accessToken = await tokenRes.text();

    const audioBlob = Buffer.from(audioBase64, "base64");
    const url = `https://${AZURE_SPEECH_REGION}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1?language=en-US&format=detailed`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": format === "webm" ? "audio/webm" : "audio/wav; codecs=audio/pcm; samplerate=16000",
        Accept: "application/json",
      },
      body: audioBlob,
      signal: AbortSignal.timeout(30000),
    });

    if (!res.ok) return null;

    const data = await res.json();
    const best = data.NBest?.[0] || {};
    return {
      text: data.DisplayText || "",
      confidence: best.Confidence || 0,
      durationMs: data.Duration || 0,
      source: "azure",
    };
  } catch (e) {
    logger.warn("Azure STT failed", { error: (e as Error).message });
    return null;
  }
}

export async function transcribeAudio(
  audioBase64: string,
  format: string = "wav"
): Promise<TranscriptionResult> {
  const groqResult = await transcribeGroq(audioBase64, format);
  if (groqResult) return groqResult;

  const azureResult = await transcribeAzure(audioBase64, format);
  if (azureResult) return azureResult;

  return { text: "", confidence: 0, durationMs: 0, source: "none" };
}
