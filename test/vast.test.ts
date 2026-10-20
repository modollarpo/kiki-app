import { describe, it, expect } from "vitest";
import { buildVastXml, buildEmptyVast, formatDuration, escapeXml, VAST_VERSION } from "@/lib/vast";

describe("vast — duration formatting", () => {
  it("formats seconds as HH:MM:SS", () => {
    expect(formatDuration(15)).toBe("00:00:15");
    expect(formatDuration(65)).toBe("00:01:05");
    expect(formatDuration(3661)).toBe("01:01:01");
  });

  it("clamps invalid/negative durations to zero", () => {
    expect(formatDuration(-5)).toBe("00:00:00");
    expect(formatDuration(NaN)).toBe("00:00:00");
  });
});

describe("vast — escaping", () => {
  it("escapes XML metacharacters", () => {
    expect(escapeXml(`a & b < c > "d" 'e'`)).toBe("a &amp; b &lt; c &gt; &quot;d&quot; &apos;e&apos;");
  });
});

describe("vast — empty document", () => {
  it("returns a versioned VAST with no Ad", () => {
    const xml = buildEmptyVast();
    expect(xml).toContain(`<VAST version="${VAST_VERSION}">`);
    expect(xml).not.toContain("<Ad ");
  });

  it("includes an Error node when provided", () => {
    expect(buildEmptyVast("https://keekii.net/e")).toContain("<Error><![CDATA[https://keekii.net/e]]></Error>");
  });
});

describe("vast — inline document", () => {
  const xml = buildVastXml({
    adId: "imp_1",
    title: "Spring <Sale>",
    duration: 15,
    skipAfterSeconds: 5,
    mediaFiles: [{ url: "https://cdn/ad.mp4", mimeType: "video/mp4", width: 1920, height: 1080 }],
    impressionUrl: "https://keekii.net/api/ads/beacon?e=imp&id=imp_1",
    clickThroughUrl: "https://keekii.net/api/ads/click?id=imp_1",
    clickTrackingUrls: ["https://keekii.net/api/ads/beacon?e=click&id=imp_1"],
    trackingUrls: {
      start: "https://keekii.net/api/ads/beacon?e=start&id=imp_1",
      firstQuartile: "https://keekii.net/api/ads/beacon?e=q1&id=imp_1",
      complete: "https://keekii.net/api/ads/beacon?e=complete&id=imp_1",
    },
  });

  it("emits the Ad, Impression and Creative nodes", () => {
    expect(xml).toContain('<Ad id="imp_1">');
    expect(xml).toContain("<Impression><![CDATA[https://keekii.net/api/ads/beacon?e=imp&id=imp_1]]></Impression>");
    expect(xml).toContain('<MediaFile delivery="progressive" type="video/mp4" width="1920" height="1080">');
  });

  it("renders duration and skip offset in VAST format", () => {
    expect(xml).toContain("<Duration>00:00:15</Duration>");
    expect(xml).toContain('skipoffset="00:00:05"');
  });

  it("escapes the title and includes click tracking + events", () => {
    expect(xml).toContain("<AdTitle>Spring &lt;Sale&gt;</AdTitle>");
    expect(xml).toContain("<ClickThrough><![CDATA[https://keekii.net/api/ads/click?id=imp_1]]></ClickThrough>");
    expect(xml).toContain('<Tracking event="firstQuartile">');
    expect(xml).toContain('<Tracking event="complete">');
  });

  it("omits skipoffset for unskippable ads", () => {
    const unskippable = buildVastXml({
      adId: "imp_2",
      title: "No skip",
      duration: 10,
      skipAfterSeconds: null,
      mediaFiles: [{ url: "https://cdn/ad.mp4", mimeType: "video/mp4", width: 640, height: 360 }],
      impressionUrl: "https://keekii.net/i",
      trackingUrls: {},
    });
    expect(unskippable).not.toContain("skipoffset");
  });
});
