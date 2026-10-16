export const dynamic = "force-dynamic";
import { getUserFromRequest, json, jsonError } from "@/lib/auth";
import { checkEnforcement } from "@/lib/tenant";
import { createTopUpCheckoutSession } from "@/lib/wallet";
import { stripeEnabled } from "@/lib/stripe";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

export async function POST(req: Request) {
  const user = getUserFromRequest(req);
  if (!user) return jsonError("Unauthorized", 401);

  const enf = await checkEnforcement(user.tenantId);
  if (!enf.allowed) return jsonError(enf.reason || "Access denied", 403);

  if (!stripeEnabled) {
    return json({ ok: false, error: "Stripe is not configured", code: "SERVICE_NOT_CONFIGURED" }, 503);
  }

  const rl = checkRateLimit(`wallet:checkout:${getClientIp(req)}`, { maxRequests: 20 });
  if (!rl.allowed) return rateLimitResponse(rl);

  let amount: number;
  try {
    const body = await req.json();
    amount = Number(body?.amount);
  } catch {
    return jsonError("Invalid request body");
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    return jsonError("Amount must be a positive number");
  }
  if (amount > 1_000_000) {
    return jsonError("Maximum top-up is $1,000,000");
  }

  // Derive the public base URL at runtime from the inbound request so the
  // Stripe redirect returns the user to the host they came from. (Avoids
  // relying on NEXT_PUBLIC_* which is inlined at build time.)
  const proto = req.headers.get("x-forwarded-proto") || "https";
  const host =
    req.headers.get("x-forwarded-host") ||
    req.headers.get("host") ||
    new URL(req.url).host;
  const baseUrl = `${proto}://${host}`;

  try {
    const result = await createTopUpCheckoutSession(user.tenantId, amount, baseUrl);
    if (!result.success || !result.url) {
      logger.error("wallet/checkout failed", { message: result.error || "no url" });
      return jsonError(result.error || "Failed to start checkout", 400);
    }
    return json({ url: result.url });
  } catch (error) {
    logger.error("wallet/checkout unexpected failure", {
      message: error instanceof Error ? error.message : String(error),
    });
    return jsonError("Failed to start checkout", 500);
  }
}
