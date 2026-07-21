export const dynamic = "force-dynamic";
import { json, jsonError, getUserFromRequest } from "@/lib/auth";
import { predictLTV, predictLTVBatch, type SignalData } from "@/lib/ltv-engine";
import { handleApiError } from "@/lib/logger";

export async function POST(req: Request) {
  try {
    // Tenant-scoped predictions — require an authenticated session.
    if (!getUserFromRequest(req)) {
      return jsonError("Authentication required", 401);
    }

    const body = await req.json();

    if (Array.isArray(body.signals)) {
      const results = await predictLTVBatch(body.signals as SignalData[]);
      return json({ predictions: results });
    }

    const result = await predictLTV(body as SignalData);
    return json(result);
  } catch (e) {
    return handleApiError(e, "ltv/handler");
  }
}
