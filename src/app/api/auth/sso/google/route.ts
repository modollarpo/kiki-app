export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { jsonError } from "@/lib/auth";
import { logger, setRequestId, generateRequestId } from "@/lib/logger";
import {
  buildGoogleAuthUrl,
  createPkcePair,
  createState,
  serializeSetCookie,
  GOOGLE_SSO_COOKIE_MAX_AGE,
  GOOGLE_SSO_STATE_COOKIE,
  GOOGLE_SSO_VERIFIER_COOKIE,
} from "@/lib/google-sso";

export async function GET() {
  setRequestId(generateRequestId());
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  if (!clientId) {
    logger.warn("[Auth] Google SSO not configured — GOOGLE_OAUTH_CLIENT_ID missing");
    return jsonError("Google SSO is not configured", 501);
  }

  const redirectUri = `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/auth/sso/google/callback`;
  const state = createState();
  const { verifier, challenge } = createPkcePair();

  const url = buildGoogleAuthUrl({ clientId, redirectUri, state, codeChallenge: challenge });

  const res = NextResponse.redirect(url.toString(), 302);
  // Bind the state (CSRF) and PKCE verifier to this browser via short-lived
  // HttpOnly cookies; the callback verifies the state before exchanging code.
  const secure = process.env.NODE_ENV === "production";
  const cookieOpts = { maxAge: GOOGLE_SSO_COOKIE_MAX_AGE, secure };
  res.headers.append("Set-Cookie", serializeSetCookie(GOOGLE_SSO_STATE_COOKIE, state, cookieOpts));
  res.headers.append("Set-Cookie", serializeSetCookie(GOOGLE_SSO_VERIFIER_COOKIE, verifier, cookieOpts));
  return res;
}
