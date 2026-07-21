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

// ── Validate Environment ──────────────────────────────────

export function validateEnvironment(): { valid: boolean; errors: string[]; warnings: string[] } {
  if (validated) return { valid: validationErrors.length === 0, errors: validationErrors, warnings: [] };

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

  return { valid: errors.length === 0, errors, warnings };
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
