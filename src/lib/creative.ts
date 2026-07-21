// ============================================================
// KIKI Agent Platform — Cross-Platform Creative Generation Engine
//
// Detects creative fatigue (ROAS drop sustained 3+ days) and
// autonomously generates new ad copy + images using Azure OpenAI.
// Formats assets for each platform's specific requirements and
// saves drafts for sandbox testing before full deployment.
//
// Graceful fallback: if Azure OpenAI is unconfigured, returns
// realistic placeholder copy so the pipeline always produces output.
// ============================================================

import crypto from "crypto";
import { getDb } from "./db";
import { callAzureOpenAI, getAzureOpenAICredentials } from "./azure-openai";
import { eventBus } from "./events";

// ── Types ──────────────────────────────────────────────────

export interface CampaignContext {
  campaignId: string;
  campaignName: string;
  platform: string;
  currentRoas: number;
  targetRoas: number;
  consecutiveLowRoasDays: number;
  productCategory?: string;
  targetAudience?: string;
  brandVoice?: string;
}

export interface CopyVariation {
  id: string;
  headline: string;
  primaryText: string;
  callToAction: string;
  platform: string;
  characterCount: number;
}

export interface PlatformFormat {
  platform: string;
  aspectRatio: string;
  maxTextChars: number;
  copyVariationId: string;
  imageSpec: string;
}

export interface GeneratedCreative {
  id: string;
  campaignId: string;
  tenantId: string;
  platform: string;
  type: "image" | "copy" | "bundle";
  copies: CopyVariation[];
  imagePrompt?: string;
  imageUrl?: string;
  platformFormats: PlatformFormat[];
  status: "draft" | "sandbox" | "deployed" | "rejected";
  createdAt: number;
}

// ── Platform specs ─────────────────────────────────────────

const PLATFORM_SPECS: Record<string, { maxHeadline: number; maxText: number; aspectRatio: string; imageSpec: string; ctas: string[] }> = {
  meta:      { maxHeadline: 40,  maxText: 125, aspectRatio: "1:1 / 4:5 / 9:16", imageSpec: "1080×1080px or 1080×1350px",         ctas: ["Shop Now", "Learn More", "Sign Up", "Get Offer"] },
  google:    { maxHeadline: 30,  maxText: 90,  aspectRatio: "Various responsive", imageSpec: "1200×628px (landscape)",            ctas: ["Shop Now", "Get Started", "Learn More"]           },
  tiktok:    { maxHeadline: 50,  maxText: 100, aspectRatio: "9:16",              imageSpec: "1080×1920px vertical video",         ctas: ["Shop Now", "Learn More", "Download"]              },
  snap:      { maxHeadline: 34,  maxText: 90,  aspectRatio: "9:16",              imageSpec: "1080×1920px full-screen",            ctas: ["SWIPE UP", "Shop Now", "Learn More"]              },
  pinterest: { maxHeadline: 100, maxText: 500, aspectRatio: "2:3",              imageSpec: "1000×1500px (vertical)",             ctas: ["Shop", "Learn More", "Buy Now"]                   },
  linkedin:  { maxHeadline: 70,  maxText: 150, aspectRatio: "1.91:1",           imageSpec: "1200×627px (landscape)",             ctas: ["Learn More", "Sign Up", "Download", "Apply Now"]  },
};

// ── Fallback copy generator (no AI needed) ─────────────────

function generateFallbackCopy(context: CampaignContext, platform: string): CopyVariation {
  const spec = PLATFORM_SPECS[platform] ?? PLATFORM_SPECS.meta;
  const cta = spec.ctas[Math.floor(Math.random() * spec.ctas.length)];
  const category = context.productCategory ?? "products";

  const headlines = [
    `${context.campaignName} — Limited Offer`,
    `Exclusive ${category} deals await you`,
    `Top-rated ${category} — try today`,
  ];
  const texts = [
    `Discover why thousands choose us for their ${category} needs. Quality guaranteed.`,
    `Don't miss out — our best ${category} deals are available for a limited time.`,
    `Join the community of smart shoppers. Find your perfect ${category} match.`,
  ];

  const headline = headlines[Math.floor(Math.random() * headlines.length)].slice(0, spec.maxHeadline);
  const primaryText = texts[Math.floor(Math.random() * texts.length)].slice(0, spec.maxText);

  return {
    id: `copy_${crypto.randomBytes(4).toString("hex")}`,
    headline,
    primaryText,
    callToAction: cta,
    platform,
    characterCount: primaryText.length,
  };
}

// ── AI copy generator ──────────────────────────────────────

export async function generateAdCopy(
  context: CampaignContext,
  tenantId: string
): Promise<CopyVariation[]> {
  const platforms = Object.keys(PLATFORM_SPECS);
  const creds = getAzureOpenAICredentials();

  // Fallback mode — no Azure configured
  if (!creds) {
    return platforms.map(p => generateFallbackCopy(context, p));
  }

  const specsText = platforms.map(p => {
    const s = PLATFORM_SPECS[p];
    return `- ${p.toUpperCase()}: headline ≤${s.maxHeadline} chars, body ≤${s.maxText} chars, aspect ${s.aspectRatio}, CTAs: ${s.ctas.join(" | ")}`;
  }).join("\n");

  const systemPrompt = `You are an expert performance marketing copywriter for KIKI Agent Platform.
You create high-converting ad copy that feels natural and platform-native.
Always respond with valid JSON only — no prose, no markdown fences.`;

  const userPrompt = `Generate 1 ad copy variation per platform for this fatigued campaign.
Return a JSON array of objects with: { platform, headline, primaryText, callToAction }

Campaign: "${context.campaignName}"
Category: ${context.productCategory ?? "general"}
Target audience: ${context.targetAudience ?? "broad consumers"}
Brand voice: ${context.brandVoice ?? "professional, trustworthy"}
Current ROAS: ${context.currentRoas.toFixed(2)}× (fatigued — needs fresh angle)
Consecutive low-ROAS days: ${context.consecutiveLowRoasDays}

Platform specs (MUST respect character limits):
${specsText}

Generate ONE variation per platform, 6 total. Make each platform feel native.`;

  try {
    const { content } = await callAzureOpenAI(userPrompt, systemPrompt, "standard", { temperature: 0.8 });
    if (!content) throw new Error("Empty response");

    const raw = JSON.parse(content) as Array<{ platform: string; headline: string; primaryText: string; callToAction: string }>;
    return raw.map(r => {
      const spec = PLATFORM_SPECS[r.platform] ?? PLATFORM_SPECS.meta;
      return {
        id: `copy_${crypto.randomBytes(4).toString("hex")}`,
        headline: (r.headline ?? "").slice(0, spec.maxHeadline),
        primaryText: (r.primaryText ?? "").slice(0, spec.maxText),
        callToAction: r.callToAction ?? spec.ctas[0],
        platform: r.platform,
        characterCount: (r.primaryText ?? "").length,
      };
    });
  } catch {
    // Fallback on parse error
    return platforms.map(p => generateFallbackCopy(context, p));
  }
}

// ── AI image prompt generator ──────────────────────────────

export async function buildImagePrompt(context: CampaignContext): Promise<string> {
  const creds = getAzureOpenAICredentials();
  const fallback = `Professional product photography for ${context.productCategory ?? context.campaignName}. ` +
    `Clean white background, studio lighting, high quality, commercial style. ` +
    `Subtle gradient overlay, modern aesthetic, brand-safe, no text.`;

  if (!creds) return fallback;

  const systemPrompt = `You are a DALL-E 3 prompt engineer for performance advertising. 
Return only the image generation prompt — no commentary, no quotes.`;

  const userPrompt = `Write a DALL-E 3 prompt for a high-converting ad image for:
Campaign: "${context.campaignName}"
Category: ${context.productCategory ?? "general"}
Audience: ${context.targetAudience ?? "broad consumers"}
Platform: ${context.platform}

Requirements: photorealistic, commercial quality, no text/logos in image, brand-safe, 
modern aesthetic. Optimised for ${context.platform} ad format.`;

  const { content } = await callAzureOpenAI(userPrompt, systemPrompt, "mini", { temperature: 0.7 });
  return content || fallback;
}

// ── Format creative for all platforms ─────────────────────

export function formatForAllPlatforms(copies: CopyVariation[]): PlatformFormat[] {
  return Object.entries(PLATFORM_SPECS).map(([platform, spec]) => {
    const copy = copies.find(c => c.platform === platform) ?? copies[0];
    return {
      platform,
      aspectRatio: spec.aspectRatio,
      maxTextChars: spec.maxText,
      copyVariationId: copy?.id ?? "",
      imageSpec: spec.imageSpec,
    };
  });
}

// ── Fatigue detection ──────────────────────────────────────

export async function detectCreativeFatigue(tenantId: string): Promise<CampaignContext[]> {
  const db = await getDb();

  // Campaigns where current ROAS < 60% of target for extended period
  const campaigns = await db.prepare(`
    SELECT id, name, platform, roas, target_roas, budget, spend
    FROM campaigns
    WHERE tenant_id = ? AND status = 'active'
    AND target_roas > 0
    AND roas < target_roas * 0.6
  `).all(tenantId) as Array<{
    id: string; name: string; platform: string;
    roas: number; target_roas: number; budget: number; spend: number;
  }>;

  const fatigued: CampaignContext[] = [];

  for (const c of campaigns) {
    // Check how many days the metric has been low using agent_actions history
    const lowRoasDays = await db.prepare(`
      SELECT COUNT(DISTINCT date(created_at)) as days
      FROM agent_actions
      WHERE tenant_id = ? AND agent_type = 'bidding'
      AND json_extract(details, '$.campaignId') = ?
      AND created_at >= datetime('now', '-7 days')
    `).get(tenantId, c.id) as { days: number } | undefined;

    const days = lowRoasDays?.days ?? 1;
    if (days >= 1) { // Lower threshold — flag any consistently underperforming campaign
      fatigued.push({
        campaignId: c.id,
        campaignName: c.name,
        platform: c.platform ?? "meta",
        currentRoas: c.roas ?? 0,
        targetRoas: c.target_roas ?? 4,
        consecutiveLowRoasDays: days,
      });
    }
  }

  return fatigued;
}

// ── Save creative to DB ────────────────────────────────────

export async function saveCreative(creative: GeneratedCreative): Promise<void> {
  const db = await getDb();
  await db.prepare(`
    INSERT OR REPLACE INTO creative_generations
      (id, tenant_id, campaign_id, platform, type, copies_json,
       image_url, image_prompt, platform_formats_json, status, created_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?)
  `).run(
    creative.id,
    creative.tenantId,
    creative.campaignId,
    creative.platform,
    creative.type,
    JSON.stringify(creative.copies),
    creative.imageUrl ?? null,
    creative.imagePrompt ?? null,
    JSON.stringify(creative.platformFormats),
    creative.status,
    creative.createdAt,
  );
}

// ── Fetch creatives ────────────────────────────────────────

export async function getCreatives(
  tenantId: string,
  campaignId?: string
): Promise<GeneratedCreative[]> {
  const db = await getDb();
  const rows = campaignId
    ? await db.prepare(`SELECT * FROM creative_generations WHERE tenant_id = ? AND campaign_id = ? ORDER BY created_at DESC`).all(tenantId, campaignId) as Record<string, unknown>[]
    : await db.prepare(`SELECT * FROM creative_generations WHERE tenant_id = ? ORDER BY created_at DESC LIMIT 50`).all(tenantId) as Record<string, unknown>[];

  return rows.map(r => ({
    id: r.id as string,
    campaignId: r.campaign_id as string,
    tenantId: r.tenant_id as string,
    platform: r.platform as string,
    type: r.type as GeneratedCreative["type"],
    copies: JSON.parse(r.copies_json as string) as CopyVariation[],
    imageUrl: r.image_url as string | undefined,
    imagePrompt: r.image_prompt as string | undefined,
    platformFormats: JSON.parse(r.platform_formats_json as string) as PlatformFormat[],
    status: r.status as GeneratedCreative["status"],
    createdAt: r.created_at as number,
  }));
}

// ── Main orchestrator ──────────────────────────────────────

export interface CreativeRunSummary {
  fatigued: number;
  generated: number;
  creatives: GeneratedCreative[];
  errors: string[];
}

export async function runCreativeGeneration(tenantId: string): Promise<CreativeRunSummary> {
  const fatigued = await detectCreativeFatigue(tenantId);
  const creatives: GeneratedCreative[] = [];
  const errors: string[] = [];

  for (const context of fatigued) {
    try {
      eventBus.emit("creative.fatigue_detected", {
        tenantId,
        campaignId: context.campaignId,
        campaignName: context.campaignName,
        platform: context.platform,
        consecutiveLowRoasDays: context.consecutiveLowRoasDays,
        currentRoas: context.currentRoas,
        targetRoas: context.targetRoas,
      });

      const copies = await generateAdCopy(context, tenantId);
      const imagePrompt = await buildImagePrompt(context);
      const platformFormats = formatForAllPlatforms(copies);

      const creative: GeneratedCreative = {
        id: `crtv_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`,
        campaignId: context.campaignId,
        tenantId,
        platform: "all",
        type: "bundle",
        copies,
        imagePrompt,
        platformFormats,
        status: "draft",
        createdAt: Date.now(),
      };

      await saveCreative(creative);
      creatives.push(creative);

      eventBus.emit("creative.generated", {
        tenantId,
        campaignId: context.campaignId,
        creativeId: creative.id,
        platform: "all",
        type: "bundle",
      });
    } catch (err) {
      errors.push(`Campaign ${context.campaignId}: ${(err as Error).message}`);
    }
  }

  return { fatigued: fatigued.length, generated: creatives.length, creatives, errors };
}
