import { json, jsonError } from "@/lib/auth";
import { predictLTV, predictLTVBatch, type SignalData } from "@/lib/ltv-engine";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (Array.isArray(body.signals)) {
      const results = await predictLTVBatch(body.signals as SignalData[]);
      return json({ predictions: results });
    }

    const result = await predictLTV(body as SignalData);
    return json(result);
  } catch {
    return jsonError("Invalid request body", 400);
  }
}
