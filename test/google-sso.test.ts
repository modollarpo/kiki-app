import { describe, it, expect } from "vitest";
import crypto from "crypto";
import {
  createPkcePair,
  createState,
  buildGoogleAuthUrl,
  isVerifiedGoogleEmail,
  getCookieValue,
  safeEqual,
  serializeSetCookie,
  clearSetCookie,
} from "../src/lib/google-sso";

describe("google sso helpers", () => {
  it("creates an S256 PKCE pair from the verifier", () => {
    const { verifier, challenge } = createPkcePair();
    expect(verifier.length).toBeGreaterThanOrEqual(43);
    expect(challenge).toBe(
      crypto.createHash("sha256").update(verifier).digest("base64url")
    );
  });

  it("creates unique high-entropy state values", () => {
    expect(createState()).not.toBe(createState());
  });

  it("builds an authorization URL carrying state and PKCE params", () => {
    const url = new URL(
      buildGoogleAuthUrl({
        clientId: "cid",
        redirectUri: "https://app.example.com/cb",
        state: "st",
        codeChallenge: "ch",
      })
    );
    expect(url.origin + url.pathname).toBe("https://accounts.google.com/o/oauth2/v2/auth");
    expect(url.searchParams.get("client_id")).toBe("cid");
    expect(url.searchParams.get("response_type")).toBe("code");
    expect(url.searchParams.get("state")).toBe("st");
    expect(url.searchParams.get("code_challenge")).toBe("ch");
    expect(url.searchParams.get("code_challenge_method")).toBe("S256");
  });

  it("only accepts profiles with a verified email", () => {
    expect(isVerifiedGoogleEmail(undefined)).toBe(false);
    expect(isVerifiedGoogleEmail({ email: "a@b.com" })).toBe(false);
    expect(isVerifiedGoogleEmail({ email: "a@b.com", verified_email: false })).toBe(false);
    expect(isVerifiedGoogleEmail({ verified_email: true })).toBe(false);
    expect(isVerifiedGoogleEmail({ email: "a@b.com", verified_email: true })).toBe(true);
  });

  it("parses cookies and compares state in constant time", () => {
    const header = "a=1; kiki_g_state=abc%3D; kiki_g_verifier=xyz";
    expect(getCookieValue(header, "kiki_g_state")).toBe("abc=");
    expect(getCookieValue(header, "kiki_g_verifier")).toBe("xyz");
    expect(getCookieValue(header, "missing")).toBeUndefined();
    expect(getCookieValue(null, "x")).toBeUndefined();

    expect(safeEqual("abc", "abc")).toBe(true);
    expect(safeEqual("abc", "abd")).toBe(false);
    expect(safeEqual("abc", "abcd")).toBe(false);
  });

  it("serializes hardened one-shot cookies", () => {
    const set = serializeSetCookie("kiki_g_state", "a b", { maxAge: 600, secure: true });
    expect(set).toContain("kiki_g_state=a%20b");
    expect(set).toContain("HttpOnly");
    expect(set).toContain("SameSite=Lax");
    expect(set).toContain("Max-Age=600");
    expect(set).toContain("Secure");
    expect(clearSetCookie("kiki_g_state")).toContain("Max-Age=0");
  });
});
