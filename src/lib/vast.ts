// ============================================================
// VAST 4.2 document builder (pure — no I/O, no DB).
//
// Produces the ad response for video consumers. PlayTube hands the
// configured tag URL straight to its player (Google IMA / video.js /
// mediaelement), which fetches this XML and fires the inline tracking
// pixels back at the network. All URLs are precomputed by the caller so
// this module stays free of request/DB concerns and is trivially testable.
// ============================================================

export const VAST_VERSION = "4.2";

// VAST tracking events the builder emits, mapped to the network's internal
// beacon event codes (see AdEventType in ./ad-server).
export type VastEvent =
  | "start"
  | "firstQuartile"
  | "midpoint"
  | "thirdQuartile"
  | "complete"
  | "skip"
  | "mute"
  | "unmute"
  | "pause"
  | "resume"
  | "fullscreen"
  | "rewind";

export interface VastMediaFile {
  url: string;
  mimeType: string;
  width: number;
  height: number;
  bitrate?: number;
}

export interface VastLinearAd {
  adId: string;
  title: string;
  adSystem?: string;
  /** Seconds. */
  duration: number;
  /** Seconds; null means unskippable. */
  skipAfterSeconds: number | null;
  mediaFiles: VastMediaFile[];
  impressionUrl: string;
  clickThroughUrl?: string | null;
  clickTrackingUrls?: string[];
  trackingUrls: Partial<Record<VastEvent, string>>;
  errorUrl?: string;
}

/** Escapes text for safe inclusion in XML character data / CDATA-free nodes. */
export function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** Formats a second count as VAST's HH:MM:SS duration. */
export function formatDuration(totalSeconds: number): string {
  const safe = Number.isFinite(totalSeconds) && totalSeconds > 0 ? Math.round(totalSeconds) : 0;
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = safe % 60;
  return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
}

/** A VAST document that declares no ad was filled. */
export function buildEmptyVast(errorUrl?: string): string {
  const error = errorUrl ? `\n  <Error><![CDATA[${errorUrl}]]></Error>` : "";
  return `<?xml version="1.0" encoding="UTF-8"?>\n<VAST version="${VAST_VERSION}">${error}\n</VAST>`;
}

/** Builds a single-inline-ad VAST 4.2 document. */
export function buildVastXml(ad: VastLinearAd): string {
  const mediaFiles = ad.mediaFiles
    .map((mf) => {
      const attrs = [
        `delivery="progressive"`,
        `type="${escapeXml(mf.mimeType)}"`,
        `width="${mf.width}"`,
        `height="${mf.height}"`,
        mf.bitrate ? `bitrate="${mf.bitrate}"` : "",
      ]
        .filter(Boolean)
        .join(" ");
      return `        <MediaFile ${attrs}><![CDATA[${mf.url}]]></MediaFile>`;
    })
    .join("\n");

  const skipAttr = ad.skipAfterSeconds != null ? ` skipoffset="${formatDuration(ad.skipAfterSeconds)}"` : "";

  const tracking = (Object.entries(ad.trackingUrls) as [VastEvent, string | undefined][])
    .filter(([, url]) => Boolean(url))
    .map(([event, url]) => `          <Tracking event="${event}"><![CDATA[${url}]]></Tracking>`)
    .join("\n");

  const clickTracking = (ad.clickTrackingUrls ?? [])
    .map((url) => `            <ClickTracking><![CDATA[${url}]]></ClickTracking>`)
    .join("\n");

  const videoClicks = ad.clickThroughUrl
    ? `          <VideoClicks>\n            <ClickThrough><![CDATA[${ad.clickThroughUrl}]]></ClickThrough>${clickTracking ? `\n${clickTracking}` : ""}\n          </VideoClicks>\n`
    : clickTracking
      ? `          <VideoClicks>\n${clickTracking}\n          </VideoClicks>\n`
      : "";

  const errorNode = ad.errorUrl
    ? `\n      <Error><![CDATA[${ad.errorUrl}]]></Error>`
    : "";

  return `<?xml version="1.0" encoding="UTF-8"?>
<VAST version="${VAST_VERSION}">
  <Ad id="${escapeXml(ad.adId)}">
    <InLine>
      <AdSystem>${escapeXml(ad.adSystem ?? "KIKI")}</AdSystem>
      <AdTitle>${escapeXml(ad.title)}</AdTitle>
      <Impression><![CDATA[${ad.impressionUrl}]]></Impression>
      <Creatives>
        <Creative>
          <Linear${skipAttr}>
            <Duration>${formatDuration(ad.duration)}</Duration>
            <MediaFiles>
${mediaFiles}
            </MediaFiles>
${videoClicks}            <TrackingEvents>
${tracking}
            </TrackingEvents>
          </Linear>
        </Creative>
      </Creatives>${errorNode}
    </InLine>
  </Ad>
</VAST>`;
}
