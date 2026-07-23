import { logger } from "./logger";
import { withRetry } from "./retry";

const AZURE_TRANSLATOR_ENDPOINT = process.env.AZURE_TRANSLATOR_ENDPOINT || "";
const AZURE_TRANSLATOR_KEY = process.env.AZURE_TRANSLATOR_KEY || "";
const AZURE_TRANSLATOR_REGION = process.env.AZURE_TRANSLATOR_REGION || "swedencentral";
const LIBRE_TRANSLATE_URL = process.env.LIBRE_TRANSLATE_URL || "http://libretranslate:5000";

interface TranslationResult {
  translatedText: string;
  detectedLanguage?: string;
  source: "libre" | "azure" | "none";
}

function detectLanguageSimple(text: string): string {
  const arabic = /[\u0600-\u06FF]/;
  const chinese = /[\u4E00-\u9FFF]/;
  const japanese = /[\u3040-\u309F\u30A0-\u30FF]/;
  const korean = /[\uAC00-\uD7AF]/;
  const cyrillic = /[\u0400-\u04FF]/;

  if (arabic.test(text)) return "ar";
  if (chinese.test(text)) return "zh";
  if (japanese.test(text)) return "ja";
  if (korean.test(text)) return "ko";
  if (cyrillic.test(text)) return "ru";
  return "en";
}

async function translateLibre(
  text: string,
  target: string,
  source?: string
): Promise<TranslationResult | null> {
  try {
    return await withRetry(async () => {
      const body: Record<string, string> = { q: text, target };
      if (source) body.source = source;

      const res = await fetch(`${LIBRE_TRANSLATE_URL}/translate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(10000),
      });

      if (!res.ok) {
        logger.warn("LibreTranslate API error", { status: res.status });
        return null;
      }

      const data = await res.json();
      return {
        translatedText: data.translatedText || "",
        detectedLanguage: data.detectedLanguage?.language,
        source: "libre",
      };
    }, { maxRetries: 1, baseDelayMs: 500 });
  } catch (e) {
    logger.warn("LibreTranslate failed", { error: (e as Error).message });
    return null;
  }
}

async function translateAzure(
  text: string,
  target: string,
  source?: string
): Promise<TranslationResult | null> {
  if (!AZURE_TRANSLATOR_KEY) return null;

  const endpoint = AZURE_TRANSLATOR_ENDPOINT || `https://api.cognitive.microsofttranslator.com`;
  const url = `${endpoint}/translate?api-version=3.0&to=${target}${source ? `&from=${source}` : ""}`;

  try {
    return await withRetry(async () => {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Ocp-Apim-Subscription-Key": AZURE_TRANSLATOR_KEY,
          "Ocp-Apim-Subscription-Region": AZURE_TRANSLATOR_REGION,
          "Content-Type": "application/json",
        },
        body: JSON.stringify([{ text }]),
        signal: AbortSignal.timeout(10000),
      });

      if (!res.ok) return null;

      const data = await res.json();
      const translation = data?.[0];
      return {
        translatedText: translation?.translations?.[0]?.text || "",
        detectedLanguage: translation?.detectedLanguage?.language,
        source: "azure",
      };
    }, { maxRetries: 1, baseDelayMs: 500 });
  } catch (e) {
    logger.warn("Azure Translator failed", { error: (e as Error).message });
    return null;
  }
}

export async function translateText(
  text: string,
  target: string,
  source?: string
): Promise<TranslationResult> {
  const libreResult = await translateLibre(text, target, source);
  if (libreResult) return libreResult;

  const azureResult = await translateAzure(text, target, source);
  if (azureResult) return azureResult;

  return { translatedText: text, detectedLanguage: detectLanguageSimple(text), source: "none" };
}
