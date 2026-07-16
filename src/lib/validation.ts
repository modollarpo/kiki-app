// ============================================================
// API Validation — Zod schemas + validation helpers for routes
// ============================================================

import { z } from "zod";

// ── Common Schemas ──────────────────────────────────────────

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const dateRangeSchema = z.object({
  start_date: z.string().optional(),
  end_date: z.string().optional(),
});

export const idParamSchema = z.object({
  id: z.string().min(1, "ID is required"),
});

// ── Campaign Schemas ────────────────────────────────────────

export const campaignCreateSchema = z.object({
  name: z.string().min(1, "Name is required").max(200, "Name too long"),
  platform: z.enum(["meta", "google", "tiktok", "snap", "pinterest", "linkedin"]),
  budget: z.number().positive().max(10_000_000).optional(),
  status: z.enum(["active", "paused", "draft"]).default("draft"),
});

export const campaignUpdateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  budget: z.number().positive().max(10_000_000).optional(),
  status: z.enum(["active", "paused", "draft"]).optional(),
});

export const campaignQuerySchema = paginationSchema.extend({
  status: z.enum(["active", "paused", "draft"]).optional(),
  platform: z.enum(["meta", "google", "tiktok", "snap", "pinterest", "linkedin"]).optional(),
});

// ── Bidding Schemas ─────────────────────────────────────────

export const bidOverrideSchema = z.object({
  campaignId: z.string().min(1),
  action: z.enum(["increase", "decrease", "maintain", "pause", "resume"]),
  bidAmount: z.number().positive().optional(),
  budgetAmount: z.number().positive().optional(),
  reason: z.string().max(500).optional(),
});

// ── AI Chat Schema ──────────────────────────────────────────

export const chatMessageSchema = z.object({
  message: z.string().min(1, "Message is required").max(10_000, "Message too long"),
  tier: z.enum(["fast", "mini", "standard"]).default("mini"),
});

// ── Wallet Schemas ──────────────────────────────────────────

export const walletTopUpSchema = z.object({
  amount: z.number().positive().max(100_000),
  paymentMethodId: z.string().min(1),
});

// ── Contact/CRM Schemas ─────────────────────────────────────

export const contactCreateSchema = z.object({
  email: z.string().email("Invalid email"),
  name: z.string().min(1).max(200).optional(),
  phone: z.string().max(20).optional(),
  tags: z.array(z.string()).default([]),
});

// ── Signal Schemas ──────────────────────────────────────────

export const signalSendSchema = z.object({
  platform: z.enum(["meta", "google", "tiktok", "snap", "pinterest", "linkedin"]),
  eventName: z.string().min(1).max(100),
  eventData: z.record(z.string(), z.unknown()).default({}),
});

// ── Helpers ─────────────────────────────────────────────────

export type ValidationSchema = z.ZodSchema;

export function validateSearchParams<T extends z.ZodSchema>(
  req: Request,
  schema: T
): { ok: true; data: z.infer<T> } | { ok: false; response: Response } {
  const url = new URL(req.url);
  const params: Record<string, string> = {};
  url.searchParams.forEach((v, k) => { params[k] = v; });

  const result = schema.safeParse(params);
  if (!result.success) {
    return {
      ok: false,
      response: new Response(
        JSON.stringify({ ok: false, error: result.error.issues[0]?.message || "Invalid parameters" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      ),
    };
  }
  return { ok: true, data: result.data };
}

export async function validateBody<T extends z.ZodSchema>(
  req: Request,
  schema: T
): Promise<{ ok: true; data: z.infer<T> } | { ok: false; response: Response }> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return {
      ok: false,
      response: new Response(
        JSON.stringify({ ok: false, error: "Invalid JSON body" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      ),
    };
  }

  const result = schema.safeParse(body);
  if (!result.success) {
    return {
      ok: false,
      response: new Response(
        JSON.stringify({ ok: false, error: result.error.issues[0]?.message || "Invalid request body" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      ),
    };
  }
  return { ok: true, data: result.data };
}
