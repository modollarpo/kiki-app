import { describe, it, expect } from "vitest";
import {
  pickWeighted,
  hasPlayableAsset,
  isCreativeEligible,
  decideAd,
  signAdToken,
  verifyAdToken,
  parseDbTimestamp,
  isAllowedAdOrigin,
  adCorsHeaders,
  buildTrackUrls,
  parseAdFormat,
  isAdEventType,
  type AdCreative,
} from "@/lib/ad-server";

const SECRET = "ad-test-secret-at-least-32-characters-long!!";

function creative(overrides: Partial<AdCreative> = {}): AdCreative {
  return {
    id: "adc_1",
    tenantId: "t1",
    campaignId: "c1",
    name: "Test",
    format: "video",
    mediaUrl: "https://cdn/ad.mp4",
    imageUrl: null,
    voiceoverUrl: null,
    clickUrl: "https://keekii.net",
    durationSeconds: 15,
    skipAfterSeconds: 5,
    width: 1920,
    height: 1080,
    weight: 1,
    status: "active",
    startsAt: null,
    endsAt: null,
    ...overrides,
  };
}

describe("ad-server — weighted selection", () => {
  it("returns null for an empty set", () => {
    expect(pickWeighted([])).toBeNull();
  });

  it("is deterministic for a given random value", () => {
    const items = [
      { id: "a", weight: 1 },
      { id: "b", weight: 1 },
    ];
    expect(pickWeighted(items, 0)?.id).toBe("a");
    expect(pickWeighted(items, 0.99)?.id).toBe("b");
  });

  it("skips zero-weight items", () => {
    const items = [
      { id: "a", weight: 0 },
      { id: "b", weight: 5 },
    ];
    expect(pickWeighted(items, 0)?.id).toBe("b");
  });
});

describe("ad-server — eligibility", () => {
  it("requires a playable asset for the format", () => {
    expect(hasPlayableAsset(creative())).toBe(true);
    expect(hasPlayableAsset(creative({ mediaUrl: null }))).toBe(false);
    expect(hasPlayableAsset(creative({ format: "imageWithVoice", imageUrl: "i", voiceoverUrl: null }))).toBe(false);
    expect(hasPlayableAsset(creative({ format: "imageWithVoice", imageUrl: "i", voiceoverUrl: "v" }))).toBe(true);
  });

  it("rejects inactive, out-of-window and wrong-format creatives", () => {
    const now = new Date("2026-06-15T12:00:00Z");
    expect(isCreativeEligible(creative({ status: "paused" }), { now })).toBe(false);
    expect(isCreativeEligible(creative({ endsAt: "2026-06-01T00:00:00Z" }), { now })).toBe(false);
    expect(isCreativeEligible(creative({ startsAt: "2026-07-01T00:00:00Z" }), { now })).toBe(false);
    expect(isCreativeEligible(creative({ format: "audio" }), { now, format: "video" })).toBe(false);
    expect(isCreativeEligible(creative(), { now, format: "video" })).toBe(true);
  });

  it("decideAd returns null when nothing is eligible", () => {
    expect(decideAd([creative({ status: "paused" })])).toBeNull();
  });
});

describe("ad-server — signed tracking token", () => {
  it("round-trips a valid token", () => {
    const token = signAdToken({ impressionId: "imp_1", tenantId: "t1", creativeId: "adc_1", secret: SECRET });
    const payload = verifyAdToken(token, SECRET);
    expect(payload).not.toBeNull();
    expect(payload?.i).toBe("imp_1");
    expect(payload?.t).toBe("t1");
    expect(payload?.c).toBe("adc_1");
  });

  it("rejects a tampered token", () => {
    const token = signAdToken({ impressionId: "imp_1", tenantId: "t1", secret: SECRET });
    const tampered = `${token.slice(0, -2)}xx`;
    expect(verifyAdToken(tampered, SECRET)).toBeNull();
  });

  it("rejects a token signed with a different secret", () => {
    const token = signAdToken({ impressionId: "imp_1", tenantId: "t1", secret: SECRET });
    expect(verifyAdToken(token, "a-different-secret-at-least-32-chars-long")).toBeNull();
  });

  it("rejects an expired token", () => {
    const token = signAdToken({ impressionId: "imp_1", tenantId: "t1", ttlSeconds: -10, secret: SECRET });
    expect(verifyAdToken(token, SECRET)).toBeNull();
  });

  it("rejects malformed tokens", () => {
    expect(verifyAdToken("not-a-token", SECRET)).toBeNull();
    expect(verifyAdToken("a.b.c", SECRET)).toBeNull();
  });
});

describe("ad-server — timestamp parsing", () => {
  it("parses SQLite and ISO formats", () => {
    expect(Number.isFinite(parseDbTimestamp("2026-06-15 12:00:00"))).toBe(true);
    expect(Number.isFinite(parseDbTimestamp("2026-06-15T12:00:00Z"))).toBe(true);
    expect(Number.isFinite(parseDbTimestamp("2026-06-15 12:00:00.123+00"))).toBe(true);
    expect(Number.isNaN(parseDbTimestamp(null))).toBe(true);
    expect(Number.isNaN(parseDbTimestamp(""))).toBe(true);
  });
});

describe("ad-server — CORS", () => {
  it("allows exact property origins only", () => {
    expect(isAllowedAdOrigin("https://play.keekii.net")).toBe(true);
    expect(isAllowedAdOrigin("https://play.keekii.net/")).toBe(true);
    expect(isAllowedAdOrigin("https://play.keekii.net.evil.com")).toBe(false);
    expect(isAllowedAdOrigin("https://evil.com")).toBe(false);
    expect(isAllowedAdOrigin("")).toBe(false);
  });

  it("allows the Google IMA SDK host so the VAST fetch is not CORS-blocked", () => {
    // IMA fetches the tag from its own bridge iframe; the Origin is Google's
    // SDK host, not the property. Allowing it is required for VAST playback.
    expect(isAllowedAdOrigin("https://imasdk.googleapis.com")).toBe(true);
    expect(isAllowedAdOrigin("https://imasdk.googleapis.com.evil.com")).toBe(false);
  });

  it("echoes an allowed origin and never a wildcard", () => {
    const headers = adCorsHeaders("https://music.keekii.net");
    expect(headers["Access-Control-Allow-Origin"]).toBe("https://music.keekii.net");
    expect(headers["Access-Control-Allow-Origin"]).not.toBe("*");
    const denied = adCorsHeaders("https://evil.com");
    expect(denied["Access-Control-Allow-Origin"]).toBeUndefined();
    expect(denied["Vary"]).toBe("Origin");
  });

  it("never grants credentialed cross-origin access", () => {
    expect(adCorsHeaders("https://play.keekii.net")["Access-Control-Allow-Credentials"]).toBeUndefined();
    expect(adCorsHeaders("https://evil.com")["Access-Control-Allow-Credentials"]).toBeUndefined();
  });
});

describe("ad-server — tracking URLs", () => {
  it("builds signed beacon and click URLs", () => {
    const urls = buildTrackUrls("https://keekii.net/", "imp_1", "tok.abc");
    expect(urls.impression).toBe("https://keekii.net/api/ads/beacon?e=imp&id=imp_1&t=tok.abc");
    expect(urls.click).toBe("https://keekii.net/api/ads/click?id=imp_1&t=tok.abc");
    expect(urls.tracking.complete).toContain("e=complete");
    expect(urls.tracking.q1).toContain("e=q1");
    expect(urls.error).toContain("e=error");
  });
});

describe("ad-server — parsing helpers", () => {
  it("parses formats and validates event types", () => {
    expect(parseAdFormat("VIDEO")).toBe("video");
    expect(parseAdFormat("nope")).toBeUndefined();
    expect(isAdEventType("complete")).toBe(true);
    expect(isAdEventType("bogus")).toBe(false);
  });
});
