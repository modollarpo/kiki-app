// ============================================================
// KIKI Ad Network — supply-side ad server.
//
// Serves demand (creatives bound to a campaign) into the network's own
// properties: play.keekii.net (video → VAST) and music.keekii.net
// (audio → JSON, via a remote-ad adapter). Selection is weighted,
// date-windowed and format-filtered; every fill is logged as a signed
// impression whose tracking URLs (beacon/click) are HMAC-protected.
//
// Pure helpers (token sign/verify, weighted pick, eligibility, CORS,
// URL building) carry no I/O so they are unit-tested directly. The DB
// orchestration (`serveAd`) accepts a minimal structural DB interface,
// keeping it agnostic to the pg / sqlite / memory backend.
// ============================================================

import crypto from "crypto";
import { genId, type SqlParam } from "./db";
import { logger } from "./logger";
import { serviceTokenSecret } from "./service-token";
import { verifyServiceToken } from "../../packages/shared/src/service-template/security";

// ── DB structural interface ────────────────────────────────
export interface AdStatement {
  run(...params: SqlParam[]): Promise<unknown> | unknown;
  get<T = Record<string, unknown>>(...params: SqlParam[]): Promise<T | undefined> | T | undefined;
  all<T = Record<string, unknown>>(...params: SqlParam[]): Promise<T[]> | T[];
}
export interface AdDb {
  prepare(sql: string): AdStatement;
  exec(sql: string): Promise<unknown> | unknown;
}

// ── Types ──────────────────────────────────────────────────
export type AdFormat = "video" | "audio" | "image" | "imageWithVoice";

export const AD_FORMATS: readonly AdFormat[] = ["video", "audio", "image", "imageWithVoice"];

export function parseAdFormat(value: unknown): AdFormat | undefined {
  const v = typeof value === "string" ? value.toLowerCase() : "";
  return (AD_FORMATS as readonly string[]).includes(v) ? (v as AdFormat) : undefined;
}

export const AD_EVENT_TYPES = [
  "imp",
  "start",
  "q1",
  "mid",
  "q3",
  "complete",
  "skip",
  "click",
  "error",
  "mute",
  "unmute",
  "pause",
  "resume",
  "fullscreen",
  "rewind",
] as const;
export type AdEventType = (typeof AD_EVENT_TYPES)[number];

export function isAdEventType(value: string): value is AdEventType {
  return (AD_EVENT_TYPES as readonly string[]).includes(value);
}

export interface AdCreative {
  id: string;
  tenantId: string;
  campaignId: string | null;
  name: string;
  format: AdFormat;
  mediaUrl: string | null;
  imageUrl: string | null;
  voiceoverUrl: string | null;
  clickUrl: string | null;
  durationSeconds: number;
  skipAfterSeconds: number | null;
  width: number;
  height: number;
  weight: number;
  status: string;
  startsAt: string | null;
  endsAt: string | null;
}

export interface AdFrequencyCap {
  impressions: number;
  windowHours: number;
}

export interface AdRequestInput {
  /** Supply property: "play" | "music". */
  property?: string;
  /** Slot id (preferred when the caller knows it). */
  placementId?: string;
  /** Slot slug, resolved together with `property`. */
  slot?: string;
  format?: AdFormat;
  width?: number;
  height?: number;
  minDuration?: number;
  maxDuration?: number;
  /** false → only unskippable creatives are eligible. */
  skip?: boolean;
  contentId?: string;
  userHash?: string;
  requestId?: string;
  cap?: AdFrequencyCap;
  /** Absolute origin used to build tracking URLs (e.g. https://keekii.net). */
  baseUrl: string;
  random?: number;
  now?: Date;
}

export interface AdTrackUrls {
  impression: string;
  click: string;
  tracking: Partial<Record<AdEventType, string>>;
  error: string;
}

export interface AdServeResult {
  impressionId: string;
  creative: AdCreative;
  priceCpm: number;
  token: string;
  urls: AdTrackUrls;
  slot: { id: string; format: AdFormat };
  publisher: { id: string; property: string };
}

// ── Signed tracking token ──────────────────────────────────
const DEV_AD_SECRET = "kiki-dev-ad-secret-DO-NOT-USE-IN-PRODUCTION";

export function adTokenSecret(): string {
  const secret = process.env.AD_TOKEN_SECRET || process.env.SERVICE_JWT_SECRET || process.env.JWT_SECRET;
  if (process.env.NODE_ENV === "production") {
    if (!secret || secret.length < 32) {
      throw new Error(
        "AD_TOKEN_SECRET (or JWT_SECRET) must be set to at least 32 characters in production to sign ad tracking tokens."
      );
    }
    return secret;
  }
  return secret && secret.length >= 32 ? secret : DEV_AD_SECRET;
}

export interface AdTrackToken {
  /** Impression id. */
  i: string;
  /** Tenant id. */
  t: string;
  /** Creative id. */
  c: string | null;
  /** Expiry (seconds since epoch). */
  x: number;
}

export function signAdToken(payload: {
  impressionId: string;
  tenantId: string;
  creativeId?: string | null;
  ttlSeconds?: number;
  secret?: string;
}): string {
  const secret = payload.secret ?? adTokenSecret();
  const body = Buffer.from(
    JSON.stringify({
      i: payload.impressionId,
      t: payload.tenantId,
      c: payload.creativeId ?? null,
      x: Math.floor(Date.now() / 1000) + (payload.ttlSeconds ?? 21600),
    })
  ).toString("base64url");
  const sig = crypto.createHmac("sha256", secret).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verifyAdToken(token: string, secret?: string): AdTrackToken | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 2) return null;
    const [body, sig] = parts;
    const resolved = secret ?? adTokenSecret();
    const expected = crypto.createHmac("sha256", resolved).update(body).digest("base64url");
    const provided = Buffer.from(sig, "base64url");
    const expectedBuf = Buffer.from(expected, "base64url");
    if (provided.length !== expectedBuf.length || !crypto.timingSafeEqual(provided, expectedBuf)) {
      return null;
    }
    const parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as AdTrackToken;
    if (typeof parsed.x !== "number" || parsed.x * 1000 < Date.now()) return null;
    if (!parsed.i || !parsed.t) return null;
    return parsed;
  } catch {
    return null;
  }
}

// ── Selection (pure) ───────────────────────────────────────
export interface WeightedItem {
  id: string;
  weight: number;
}

// Crypto-backed uniform [0,1): auction and coin-flip draws must not be
// predictable from prior responses, so this uses a CSPRNG.
export function secureRandom(): number {
  return crypto.randomBytes(6).readUIntBE(0, 6) / 2 ** 48;
}

export function pickWeighted<T extends WeightedItem>(items: T[], random: number = secureRandom()): T | null {
  if (items.length === 0) return null;
  const total = items.reduce((sum, it) => sum + Math.max(0, it.weight || 0), 0);
  if (total <= 0) return items[0];
  let cursor = random * total;
  for (const it of items) {
    cursor -= Math.max(0, it.weight || 0);
    if (cursor < 0) return it;
  }
  return items[items.length - 1];
}

export function hasPlayableAsset(
  c: Pick<AdCreative, "format" | "mediaUrl" | "imageUrl" | "voiceoverUrl">
): boolean {
  switch (c.format) {
    case "video":
    case "audio":
      return Boolean(c.mediaUrl);
    case "image":
      return Boolean(c.imageUrl);
    case "imageWithVoice":
      return Boolean(c.imageUrl && c.voiceoverUrl);
    default:
      return false;
  }
}

export function isCreativeEligible(
  creative: AdCreative,
  opts: { now?: Date; format?: AdFormat } = {}
): boolean {
  const now = opts.now ?? new Date();
  if (creative.status !== "active") return false;
  if (opts.format && creative.format !== opts.format) return false;
  if (creative.startsAt && Date.parse(creative.startsAt) > now.getTime()) return false;
  if (creative.endsAt && Date.parse(creative.endsAt) < now.getTime()) return false;
  return hasPlayableAsset(creative);
}

export function decideAd(
  creatives: AdCreative[],
  opts: { now?: Date; format?: AdFormat; random?: number } = {}
): AdCreative | null {
  const eligible = creatives.filter((c) => isCreativeEligible(c, opts));
  return pickWeighted(eligible, opts.random ?? secureRandom());
}

// ── CORS (exact origin match) ──────────────────────────────
const STATIC_AD_ORIGINS = [
  "https://play.keekii.net",
  "https://music.keekii.net",
  "https://keekii.net",
  "https://www.keekii.net",
  "http://localhost:3000",
];

function normalizeOrigin(origin: string): string {
  return origin.trim().replace(/\/+$/, "").toLowerCase();
}

export function allowedAdOrigins(): string[] {
  const extra = (process.env.AD_ALLOWED_ORIGINS || "")
    .split(",")
    .map((o) => o.trim())
    .filter((o) => o.length > 0);
  return [...STATIC_AD_ORIGINS, ...extra].map(normalizeOrigin);
}

export function isAllowedAdOrigin(origin: string): boolean {
  if (!origin) return false;
  return allowedAdOrigins().includes(normalizeOrigin(origin));
}

export function adCorsHeaders(origin: string): Record<string, string> {
  const headers: Record<string, string> = { Vary: "Origin" };
  if (isAllowedAdOrigin(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Access-Control-Allow-Credentials"] = "true";
  }
  return headers;
}

export const AD_CORS_METHODS = "GET, POST, OPTIONS";
export const AD_CORS_ALLOW_HEADERS = "Content-Type, Authorization, X-Request-ID";

// ── URL building ───────────────────────────────────────────
const TRACKED_EVENTS: AdEventType[] = [
  "start",
  "q1",
  "mid",
  "q3",
  "complete",
  "skip",
  "mute",
  "unmute",
  "pause",
  "resume",
  "fullscreen",
];

export function buildTrackUrls(baseUrl: string, impressionId: string, token: string): AdTrackUrls {
  const base = baseUrl.replace(/\/+$/, "");
  const id = encodeURIComponent(impressionId);
  const t = encodeURIComponent(token);
  const beacon = (e: AdEventType) => `${base}/api/ads/beacon?e=${e}&id=${id}&t=${t}`;
  const tracking: Partial<Record<AdEventType, string>> = {};
  for (const e of TRACKED_EVENTS) tracking[e] = beacon(e);
  return {
    impression: beacon("imp"),
    click: `${base}/api/ads/click?id=${id}&t=${t}`,
    tracking,
    error: beacon("error"),
  };
}

// ── Service auth (server-to-server) ────────────────────────
export function verifyAdServiceRequest(req: Request): { ok: boolean; tenantId?: string; required: boolean } {
  const secret = serviceTokenSecret();
  if (!secret) {
    // Unconfigured (local dev): services allow the request through.
    return { ok: true, required: false };
  }
  const header = req.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  const payload = token ? verifyServiceToken(token, secret) : null;
  if (!payload || typeof payload.tenantId !== "string" || payload.tenantId.length === 0) {
    return { ok: false, required: true };
  }
  return { ok: true, tenantId: payload.tenantId, required: true };
}

// ── DB orchestration ───────────────────────────────────────
interface PublisherRow {
  id: string;
  tenant_id: string;
  property: string;
  domain: string;
  status: string;
}
interface SlotRow {
  id: string;
  tenant_id: string;
  publisher_id: string;
  slug: string;
  format: string;
  default_width: number;
  default_height: number;
  floor_cpm: number;
  active: number;
}
interface CreativeRow {
  id: string;
  tenant_id: string;
  campaign_id: string | null;
  name: string;
  format: string;
  media_url: string | null;
  image_url: string | null;
  voiceover_url: string | null;
  click_url: string | null;
  duration_seconds: number;
  skip_after_seconds: number | null;
  width: number;
  height: number;
  weight: number;
  status: string;
  starts_at: string | null;
  ends_at: string | null;
}

function mapCreative(row: CreativeRow): AdCreative {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    campaignId: row.campaign_id != null ? String(row.campaign_id) : null,
    name: String(row.name ?? ""),
    format: parseAdFormat(row.format) ?? "video",
    mediaUrl: row.media_url != null ? String(row.media_url) : null,
    imageUrl: row.image_url != null ? String(row.image_url) : null,
    voiceoverUrl: row.voiceover_url != null ? String(row.voiceover_url) : null,
    clickUrl: row.click_url != null ? String(row.click_url) : null,
    durationSeconds: Number(row.duration_seconds ?? 15),
    skipAfterSeconds: row.skip_after_seconds != null ? Number(row.skip_after_seconds) : null,
    width: Number(row.width ?? 0),
    height: Number(row.height ?? 0),
    weight: Number(row.weight ?? 1),
    status: String(row.status ?? "active"),
    startsAt: row.starts_at != null ? String(row.starts_at) : null,
    endsAt: row.ends_at != null ? String(row.ends_at) : null,
  };
}

export async function resolvePlacement(
  db: AdDb,
  input: Pick<AdRequestInput, "placementId" | "property" | "slot">
): Promise<{ publisher: PublisherRow; slot: SlotRow } | null> {
  let slot: SlotRow | undefined;
  if (input.placementId) {
    slot = await db
      .prepare("SELECT * FROM ad_slots WHERE id = ? AND active = 1")
      .get<SlotRow>(input.placementId);
  }
  if (!slot && input.property && input.slot) {
    const publisher = await db
      .prepare("SELECT * FROM ad_publishers WHERE property = ? AND status = 'active'")
      .get<PublisherRow>(input.property);
    if (publisher) {
      slot = await db
        .prepare("SELECT * FROM ad_slots WHERE publisher_id = ? AND slug = ? AND active = 1")
        .get<SlotRow>(publisher.id, input.slot);
    }
  }
  if (!slot) return null;
  const publisher = await db
    .prepare("SELECT * FROM ad_publishers WHERE id = ?")
    .get<PublisherRow>(slot.publisher_id);
  if (!publisher) return null;
  return { publisher, slot };
}

/**
 * Backend-agnostic timestamp parse: handles SQLite's "YYYY-MM-DD HH:MM:SS",
 * PostgreSQL's ISO-with-fraction output and full ISO-8601.
 */
export function parseDbTimestamp(value: unknown): number {
  if (value == null) return NaN;
  const s = String(value).trim();
  if (!s) return NaN;
  const iso = s.includes("T") ? s : s.replace(" ", "T");
  const withZone = /(Z|[+-]\d{2}:?\d{2})$/.test(iso) ? iso : `${iso}Z`;
  const parsed = Date.parse(withZone);
  return Number.isNaN(parsed) ? Date.parse(s) : parsed;
}

export async function countImpressionsInWindow(
  db: AdDb,
  opts: { userHash: string; campaignId: string | null; windowHours: number; now?: Date }
): Promise<number> {
  const rows = await db
    .prepare("SELECT created_at, campaign_id FROM ad_impressions WHERE user_hash = ?")
    .all<{ created_at: string; campaign_id: string | null }>(opts.userHash);
  const now = (opts.now ?? new Date()).getTime();
  const cutoff = now - opts.windowHours * 3600_000;
  return rows.filter((r) => {
    if (opts.campaignId && r.campaign_id != null && String(r.campaign_id) !== opts.campaignId) {
      return false;
    }
    const ts = parseDbTimestamp(r.created_at);
    return Number.isFinite(ts) && ts >= cutoff;
  }).length;
}

export async function loadCreatives(db: AdDb, tenantId: string, format: AdFormat): Promise<AdCreative[]> {
  const rows = await db
    .prepare("SELECT * FROM ad_creatives WHERE tenant_id = ? AND format = ? AND status = 'active'")
    .all<CreativeRow>(tenantId, format);
  return rows.map(mapCreative);
}

export async function logImpression(
  db: AdDb,
  row: {
    id: string;
    tenantId: string;
    publisherId: string;
    slotId: string;
    creativeId: string;
    campaignId: string | null;
    format: AdFormat;
    priceCpm: number;
    userHash: string | null;
    requestId: string | null;
  }
): Promise<void> {
  try {
    await db
      .prepare(
        `INSERT INTO ad_impressions
         (id, tenant_id, publisher_id, slot_id, creative_id, campaign_id, format, price_cpm, user_hash, request_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        row.id,
        row.tenantId,
        row.publisherId,
        row.slotId,
        row.creativeId,
        row.campaignId,
        row.format,
        row.priceCpm,
        row.userHash,
        row.requestId
      );
  } catch (e) {
    logger.warn("[AdServer] impression log failed:", { error: (e as Error).message });
  }
}

export async function recordAdEvent(
  db: AdDb,
  event: { tenantId: string; impressionId: string; eventType: AdEventType; value?: number }
): Promise<void> {
  try {
    await db
      .prepare("INSERT INTO ad_events (tenant_id, impression_id, event_type, value) VALUES (?, ?, ?, ?)")
      .run(event.tenantId, event.impressionId, event.eventType, event.value ?? 0);
  } catch (e) {
    logger.warn("[AdServer] event log failed:", { error: (e as Error).message });
  }
}

export async function resolveClickTarget(
  db: AdDb,
  impressionId: string
): Promise<{ url: string | null; tenantId: string | null; creativeId: string | null }> {
  try {
    const impression = await db
      .prepare("SELECT tenant_id, creative_id FROM ad_impressions WHERE id = ?")
      .get<{ tenant_id: string; creative_id: string | null }>(impressionId);
    if (!impression) return { url: null, tenantId: null, creativeId: null };
    let url: string | null = null;
    if (impression.creative_id) {
      const creative = await db
        .prepare("SELECT click_url FROM ad_creatives WHERE id = ?")
        .get<{ click_url: string | null }>(impression.creative_id);
      url = creative?.click_url ?? null;
    }
    return { url, tenantId: impression.tenant_id, creativeId: impression.creative_id };
  } catch (e) {
    logger.warn("[AdServer] click lookup failed:", { error: (e as Error).message });
    return { url: null, tenantId: null, creativeId: null };
  }
}

export async function serveAd(db: AdDb, input: AdRequestInput): Promise<AdServeResult | null> {
  const placement = await resolvePlacement(db, input);
  if (!placement) return null;
  const { publisher, slot } = placement;
  const format = input.format ?? parseAdFormat(slot.format) ?? "video";
  const tenantId = publisher.tenant_id;

  let creatives = await loadCreatives(db, tenantId, format);
  if (input.minDuration) creatives = creatives.filter((c) => c.durationSeconds >= input.minDuration!);
  if (input.maxDuration) creatives = creatives.filter((c) => c.durationSeconds <= input.maxDuration!);
  if (input.skip === false) creatives = creatives.filter((c) => c.skipAfterSeconds == null);

  if (input.cap && input.userHash) {
    const withinCap: AdCreative[] = [];
    for (const c of creatives) {
      const seen = await countImpressionsInWindow(db, {
        userHash: input.userHash,
        campaignId: c.campaignId,
        windowHours: input.cap.windowHours,
        now: input.now,
      });
      if (seen < input.cap.impressions) withinCap.push(c);
    }
    creatives = withinCap;
  }

  const chosen = decideAd(creatives, { now: input.now, format, random: input.random });
  if (!chosen) return null;

  const impressionId = genId("imp");
  const token = signAdToken({ impressionId, tenantId, creativeId: chosen.id });
  const urls = buildTrackUrls(input.baseUrl, impressionId, token);
  const priceCpm = Number(slot.floor_cpm ?? 0);

  await logImpression(db, {
    id: impressionId,
    tenantId,
    publisherId: publisher.id,
    slotId: slot.id,
    creativeId: chosen.id,
    campaignId: chosen.campaignId,
    format,
    priceCpm,
    userHash: input.userHash ?? null,
    requestId: input.requestId ?? null,
  });

  return {
    impressionId,
    creative: chosen,
    priceCpm,
    token,
    urls,
    slot: { id: slot.id, format },
    publisher: { id: publisher.id, property: publisher.property },
  };
}
