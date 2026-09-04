export const dynamic = "force-dynamic";
import { getUserFromRequest, json, jsonError } from "@/lib/auth";
import { checkEnforcement } from "@/lib/tenant";
import { runCreativeGeneration, detectCreativeFatigue, getCreatives } from "@/lib/creative";

export async function GET(req: Request) {
  const user = getUserFromRequest(req);
  if (!user) return jsonError("Unauthorized", 401);

  const url = new URL(req.url);
  const campaignId = url.searchParams.get("campaignId") ?? undefined;

  const [fatigued, creatives] = await Promise.all([
    detectCreativeFatigue(user.tenantId),
    getCreatives(user.tenantId, campaignId),
  ]);

  return json({ ok: true, fatigued, creatives, counts: { fatigued: fatigued.length, creatives: creatives.length } });
}

export async function POST(req: Request) {
  const user = getUserFromRequest(req);
  if (!user) return jsonError("Unauthorized", 401);

  const enf = await checkEnforcement(user.tenantId);
  if (!enf.allowed) return jsonError(enf.reason || "Access denied", 403);

  const summary = await runCreativeGeneration(user.tenantId);
  return json({ ok: true, ...summary });
}
