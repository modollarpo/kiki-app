import { logger } from "./logger";
// ============================================================
// KIKI Agent Platform — Environment Validation
// Validates all required env vars at startup, fails fast if missing
// ============================================================

import crypto from "crypto";

// ── Required Environment Variables ────────────────────────

const REQUIRED_VARS = [
  "JWT_SECRET",
] as const;

const OPTIONAL_VARS = [
  "AZURE_OPENAI_ENDPOINT",
  "AZURE_OPENAI_API_KEY",
  "AZURE_OPENAI_DEPLOYMENT_MINI",
  "AZURE_OPENAI_DEPLOYMENT_FULL",
  "STRIPE_SECRET_KEY",
  "STRIPE_PUBLISHABLE_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "ENCRYPTION_KEY",
  "DATABASE_PATH",
  "NEXT_PUBLIC_APP_URL",
] as const;

// ── Validation State ──────────────────────────────────────

let validated = false;
let validationErrors: string[] = [];
let validationWarnings: string[] = [];

// ── Validate Environment ──────────────────────────────────

export function validateEnvironment(): { valid: boolean; errors: string[]; warnings: string[] } {
  if (validated) {
    const result = { valid: validationErrors.length === 0, errors: validationErrors, warnings: validationWarnings };
    assertProductionReady(result.errors);
    return result;
  }

  const errors: string[] = [];
  const warnings: string[] = [];

  // Check required vars
  for (const varName of REQUIRED_VARS) {
    if (!process.env[varName]) {
      errors.push(`Missing required environment variable: ${varName}`);
    }
  }

  // Check optional vars and warn if missing
  for (const varName of OPTIONAL_VARS) {
    if (!process.env[varName]) {
      warnings.push(`Optional environment variable not set: ${varName}`);
    }
  }

  // Validate JWT_SECRET strength
  const jwtSecret = process.env.JWT_SECRET;
  if (jwtSecret) {
    if (jwtSecret === "kiki-dev-secret-DO-NOT-USE-IN-PRODUCTION") {
      if (process.env.NODE_ENV === "production") {
        errors.push("JWT_SECRET must not use the default development value in production");
      } else {
        warnings.push("Using default JWT_SECRET — generate a real one for production: openssl rand -hex 32");
      }
    }
    if (jwtSecret.length < 32) {
      warnings.push("JWT_SECRET should be at least 32 characters for security");
    }
  }

  // Service-to-service auth: production must never boot without a DEDICATED
  // service secret, or the ad service and microservices would accept
  // unauthenticated internal calls. The session JWT_SECRET is deliberately
  // NOT accepted as a fallback in production (separating the two secrets means
  // leaking the session secret cannot mint microservice tokens).
  const serviceSecret = process.env.SERVICE_JWT_SECRET;
  if (process.env.NODE_ENV === "production") {
    if (!serviceSecret) {
      errors.push(
        "SERVICE_JWT_SECRET is required in production (generate with: openssl rand -hex 32)"
      );
    } else if (serviceSecret.length < 32) {
      errors.push("SERVICE_JWT_SECRET must be at least 32 characters in production");
    }
  } else if (!serviceSecret && !process.env.JWT_SECRET) {
    warnings.push("SERVICE_JWT_SECRET not set — internal service calls are unauthenticated in this environment");
  }

  // Validate ENCRYPTION_KEY
  const encKey = process.env.ENCRYPTION_KEY;
  if (encKey) {
    if (encKey.length !== 64) {
      warnings.push("ENCRYPTION_KEY should be 64 hex characters (32 bytes). Current length: " + encKey.length);
    }
  } else {
    warnings.push("ENCRYPTION_KEY not set — using random key (OAuth tokens will be lost on restart). Set ENCRYPTION_KEY as a 64-char hex string.");
  }

  // Validate Azure OpenAI config
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
  const apiKey = process.env.AZURE_OPENAI_API_KEY;
  if (endpoint && !apiKey) {
    errors.push("AZURE_OPENAI_ENDPOINT is set but AZURE_OPENAI_API_KEY is missing");
  }
  if (apiKey && !endpoint) {
    errors.push("AZURE_OPENAI_API_KEY is set but AZURE_OPENAI_ENDPOINT is missing");
  }

  // Validate Stripe config (if any Stripe var is set, all should be)
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const stripePub = process.env.STRIPE_PUBLISHABLE_KEY;
  if (stripeKey && !stripePub) {
    warnings.push("STRIPE_SECRET_KEY set but STRIPE_PUBLISHABLE_KEY missing");
  }

  // Validate DATABASE_PATH
  const dbPath = process.env.DATABASE_PATH;
  if (dbPath) {
    const ext = dbPath.split(".").pop();
    if (ext !== "db" && ext !== "sqlite") {
      warnings.push("DATABASE_PATH should end with .db or .sqlite");
    }
  }

  validated = true;
  validationErrors = errors;
  validationWarnings = warnings;

  if (errors.length > 0) {
    logger.error("[ENV VALIDATION] FAILED:");
    errors.forEach(e => logger.error(`  ✗ ${e}`));
  }
  if (warnings.length > 0) {
    logger.warn("[ENV VALIDATION] WARNINGS:");
    warnings.forEach(w => logger.warn(`  ⚠ ${w}`));
  }
  if (errors.length === 0 && warnings.length === 0) {
    logger.info("[ENV VALIDATION] All checks passed");
  }

  assertProductionReady(errors);

  return { valid: errors.length === 0, errors, warnings };
}

// Production must never boot with an invalid security/auth configuration.
// This is what makes a missing or default JWT_SECRET a hard startup failure
// rather than a silent fallback to a well-known development secret.
function assertProductionReady(errors: string[]): void {
  if (process.env.NODE_ENV !== "production" || process.env.NEXT_PHASE) return;
  if (errors.length === 0) return;
  throw new Error(
    "Environment validation failed in production: " + errors.join("; ")
  );
}

// ── Demo Seed Policy ──────────────────────────────────────
// Demo data (including the demo/admin accounts) must never be written to a
// production database. Enabling SEED_DEMO_DATA there is ignored, not obeyed.
export function shouldSeedDemoData(env: Record<string, string | undefined> = process.env): boolean {
  if (env.SEED_DEMO_DATA !== "true") return false;
  if (env.NODE_ENV === "production") {
    logger.warn("[SEED] SEED_DEMO_DATA=true is ignored in production — demo users are never seeded.");
    return false;
  }
  return true;
}

// Demo credentials are supplied by the environment. When absent (or too short)
// a random password is generated so no predictable default ever ships.
export function demoSeedPassword(kind: "user" | "admin", env: Record<string, string | undefined> = process.env): string {
  const name = kind === "admin" ? "DEMO_ADMIN_PASSWORD" : "DEMO_USER_PASSWORD";
  const value = env[name];
  if (value && value.length >= 8) return value;
  logger.warn(`[SEED] ${name} is not set (or shorter than 8 chars) — generating a random demo password.`);
  return crypto.randomBytes(24).toString("base64url");
}

// ── Manual Seed Route Policy ──────────────────────────────
// POST /api/seed wipes a tenant's campaigns/signals/agents and writes demo
// rows. It must never be reachable in production by accident, so it is locked
// behind BOTH a superadmin role AND an explicit ALLOW_TENANT_SEED=true opt-in.
// In production a missing opt-in is reported as "not found" (404) rather than
// forbidden so the endpoint's existence is not disclosed.
export function seedRouteEnabled(
  role: string | undefined,
  env: Record<string, string | undefined> = process.env
): boolean {
  if (role !== "superadmin") return false;
  if (env.ALLOW_TENANT_SEED !== "true") return false;
  return true;
}

export function seedRouteShouldHide(env: Record<string, string | undefined> = process.env): boolean {
  // Production hides the endpoint entirely unless it has been explicitly
  // enabled for deliberate demo provisioning.
  return env.NODE_ENV === "production" && env.ALLOW_TENANT_SEED !== "true";
}

// Demo seeding must never fabricate money. A seed call must not create a
// wallet with a made-up balance, and must never modify an existing wallet row
// (a tenant's balance is real financial state). Returns the balance to use for
// a newly created wallet, or null to skip wallet creation entirely — in
// production no wallet is created at all.
export function seedWalletBalance(
  env: Record<string, string | undefined> = process.env
): number | null {
  if (env.NODE_ENV === "production") return null;
  return 0;
}

// ── Get Encryption Key (stable across restarts) ───────────

export function getEncryptionKey(): Buffer {
  const keyHex = process.env.ENCRYPTION_KEY;
  if (keyHex) {
    return Buffer.from(keyHex, "hex");
  }
  // Fallback: generate random key (WARNING: tokens lost on restart)
  logger.warn("[CRYPTO] No ENCRYPTION_KEY set — generating random key. OAuth tokens will NOT persist across restarts.");
  return crypto.randomBytes(32);
}

// ── Auto-validate on import (skip during `next build`) ────

if (process.env.NODE_ENV === "production" && !process.env.NEXT_PHASE) {
  validateEnvironment();
}
