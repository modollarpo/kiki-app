import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { isAllowedOrigin, mobileApiMiddleware } from "../src/lib/mobile/middleware";

function req(method: string, origin: string): NextRequest {
  return new NextRequest("http://localhost/api/mobile/v1/agents", {
    method,
    headers: origin ? { origin } : {},
  });
}

describe("mobile CORS origin matching", () => {
  it("allows exact known origins", () => {
    expect(isAllowedOrigin("https://keekii.net")).toBe(true);
    expect(isAllowedOrigin("https://www.keekii.net")).toBe(true);
    expect(isAllowedOrigin("capacitor://localhost")).toBe(true);
    expect(isAllowedOrigin("http://localhost:3000")).toBe(true);
  });

  it("rejects prefix/suffix look-alike and unknown origins", () => {
    expect(isAllowedOrigin("https://keekii.net.evil.com")).toBe(false);
    expect(isAllowedOrigin("https://evil-keekii.net")).toBe(false);
    expect(isAllowedOrigin("https://evil.com")).toBe(false);
    expect(isAllowedOrigin("")).toBe(false);
  });

  it("echoes the origin for allowed preflight and denies wildcard for others", () => {
    const allowed = mobileApiMiddleware(req("OPTIONS", "https://keekii.net"));
    expect(allowed?.status).toBe(204);
    expect(allowed?.headers.get("Access-Control-Allow-Origin")).toBe("https://keekii.net");
    expect(allowed?.headers.get("Access-Control-Allow-Credentials")).toBe("true");

    const denied = mobileApiMiddleware(req("OPTIONS", "https://keekii.net.evil.com"));
    expect(denied?.status).toBe(204);
    expect(denied?.headers.get("Access-Control-Allow-Origin")).toBeNull();
  });

  it("ignores non-mobile routes", () => {
    const r = new NextRequest("http://localhost/api/dashboard", { method: "GET" });
    expect(mobileApiMiddleware(r)).toBeNull();
  });
});
