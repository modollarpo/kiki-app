export const dynamic = "force-dynamic";
import { jsonError } from "@/lib/auth";
import { logger, setRequestId, generateRequestId } from "@/lib/logger";

export async function GET() {
  setRequestId(generateRequestId());
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  if (!clientId) {
    logger.warn("[Auth] Google SSO not configured — GOOGLE_OAUTH_CLIENT_ID missing");
    return jsonError("Google SSO is not configured", 501);
  }
  const redirectUri = `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/auth/sso/google/callback`;
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  return Response.redirect(url.toString(), 302);
}
