export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getDb, genId } from "@/lib/db";
import { createSession, jsonError } from "@/lib/auth";
import { logger, setRequestId, generateRequestId } from "@/lib/logger";
import {
  getCookieValue,
  isVerifiedGoogleEmail,
  safeEqual,
  clearSetCookie,
  GOOGLE_SSO_STATE_COOKIE,
  GOOGLE_SSO_VERIFIER_COOKIE,
} from "@/lib/google-sso";

export async function GET(req: Request) {
  setRequestId(generateRequestId());
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");
    if (error) return jsonError(`Google SSO error: ${error}`, 400);
    if (!code || !state) return jsonError("Missing authorization code or state", 400);

    // Verify the state parameter against the cookie set when the flow started
    // (CSRF protection) and recover the PKCE verifier.
    const cookieHeader = req.headers.get("cookie");
    const expectedState = getCookieValue(cookieHeader, GOOGLE_SSO_STATE_COOKIE);
    const codeVerifier = getCookieValue(cookieHeader, GOOGLE_SSO_VERIFIER_COOKIE);
    if (!expectedState || !safeEqual(state, expectedState)) {
      return jsonError("Invalid OAuth state", 400);
    }
    if (!codeVerifier) {
      return jsonError("Missing PKCE verifier", 400);
    }

    const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
    if (!clientId || !clientSecret) return jsonError("Google SSO not configured", 501);

    const redirectUri = `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/auth/sso/google/callback`;
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code, client_id: clientId, client_secret: clientSecret,
        redirect_uri: redirectUri, grant_type: "authorization_code",
        code_verifier: codeVerifier,
      }),
    });
    if (!tokenRes.ok) return jsonError("Failed to exchange authorization code", 400);
    const tokens = await tokenRes.json();

    const profileRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    if (!profileRes.ok) return jsonError("Failed to fetch user profile", 400);
    const profile = await profileRes.json();

    // Only trust an email that Google reports as verified.
    if (!isVerifiedGoogleEmail(profile)) {
      logger.warn("[Auth] Google SSO rejected: unverified or missing email");
      return jsonError("Google account email is not verified", 403);
    }

    const db = await getDb();
    const email = profile.email;
    let user = await (await db.prepare("SELECT * FROM users WHERE email = ?")).get(email) as Record<string, unknown> | undefined;

    if (!user) {
      const userId = genId("usr");
      const tenantId = genId("tnt");
      const tenantName = `${profile.name || "User"}'s Organization`;
      const name = profile.name || email.split("@")[0];
      const initials = name.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2) || "U";
      const trialEndsAt = new Date(Date.now() + 14 * 86400000).toISOString();

      await (await db.prepare(`
        INSERT INTO users (id, email, name, password, role, tenant_id, tenant_name, plan, avatar_initials, trial_ends_at, last_login_at)
        VALUES (?, ?, ?, '', 'advertiser', ?, ?, 'growth', ?, ?, CURRENT_TIMESTAMP)
      `)).run(userId, email, name, tenantId, tenantName, initials, trialEndsAt);

      // New accounts start with a zero balance — no fabricated credit.
      await (await db.prepare(`
        INSERT INTO wallets (id, tenant_id, balance, currency) VALUES (?, ?, 0, 'USD')
      `)).run(genId("wlt"), tenantId);

      user = { id: userId, email, name, role: "advertiser", tenant_id: tenantId, tenant_name: tenantName, plan: "growth", avatar_initials: initials };
    } else {
      await (await db.prepare("UPDATE users SET last_login_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?")).run(String(user.id));
    }

    const sessionToken = createSession({
      id: user.id as string,
      email: user.email as string,
      name: user.name as string,
      role: user.role as string,
      tenantId: user.tenant_id as string,
      tenantName: user.tenant_name as string,
      plan: user.plan as string,
      avatarInitials: user.avatar_initials as string,
    });

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const res = NextResponse.redirect(`${baseUrl}/dashboard?token=${encodeURIComponent(sessionToken)}`, 302);
    // One-shot cookies — clear them after use.
    res.headers.append("Set-Cookie", clearSetCookie(GOOGLE_SSO_STATE_COOKIE));
    res.headers.append("Set-Cookie", clearSetCookie(GOOGLE_SSO_VERIFIER_COOKIE));
    return res;
  } catch (e) {
    logger.error("Google SSO callback failed", { message: e instanceof Error ? e.message : String(e) });
    return jsonError("SSO authentication failed", 500);
  }
}
