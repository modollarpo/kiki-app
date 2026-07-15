# KIKI Agent Platform — Azure Deployment Plan

> Status: DRAFT (awaiting Azure context confirmation)

## 1. Mode
MODIFY / MODERNIZE — existing Next.js 15 App Router application being prepared for Azure deployment.

## 2. Requirements
- Host the full KIKI Agent platform (Next.js 15 + React 18, server components, API routes).
- Real AI via Azure OpenAI (gpt-4o / gpt-4o-mini) — already wired in code via `AZURE_OPENAI_*`.
- Persistence: SQLite (better-sqlite3, native module) on the app instance.
- PWA + SEO hardening (separate workstream, code-only).
- Subscription: Microsoft Azure Sponsorship (logged in via `az`).

## 3. Codebase Scan
- Stack: Next.js 15.1.0, React 18, TypeScript, Tailwind, Zustand, better-sqlite3 (native).
- `next.config.ts`: standalone output commented out; webpack externalizes better-sqlite3; CSP + security headers already set; `/manifest.json` + SW registration present.
- Auth: JWT (`JWT_SECRET`), current DB-seeded users (alex@acmecorp.com / admin@kiki.ai).
- Env: `JWT_SECRET`, `ENCRYPTION_KEY`, `AZURE_OPENAI_*`, `STRIPE_*`, `DATABASE_PATH`, `NEXT_PUBLIC_API_URL`.
- Existing PWA: `public/manifest.json` (good), `public/sw.js` (offline + push), icons present.
- Existing SEO: `src/lib/seo.ts` (~45 Metadata objects), root `metadata` in layout.tsx, JSON-LD.
- Missing: `app/sitemap.ts`, `app/robots.ts`, dynamic OG image, metadata not wired into individual page files.

## 4. Recipe
AZCLI + Bicep (infra-as-code committed to `./infra/`), deployed via `az`. Image built remotely with `az acr build` (Linux/amd64) so the better-sqlite3 native module matches the runtime.

## 5. Architecture
- **Compute**: Azure Container Apps (Linux, managed env) + Azure Container Registry.
- **Image**: multi-stage Docker (Next.js standalone output), built via `az acr build` (remote Linux build → correct native binary).
- **AI**: Azure OpenAI (swedencentral) + deployments gpt-4o, gpt-4o-mini.
- **Persistence**: Azure File Share mounted at /app/data; `DATABASE_PATH=/app/data/kiki.db` (survives restarts).
- **Config**: Container App secrets/env from `.env.template`; Azure OpenAI endpoint + key injected.
- **Networking**: Public ingress, HTTPS, HSTS (already in next.config).

## 6. Decisions
- Region: swedencentral
- Hosting model: Container Apps + ACR
- Azure OpenAI region: swedencentral; deployments: gpt-4o (GlobalStandard), gpt-4o-mini (GlobalStandard)

## 7. Execution Steps
1. Generate Bicep (`infra/main.bicep`) + `azure.yaml` + `Dockerfile` (if container path).
2. Provision RG + resources via `az`.
3. Azure OpenAI resource + model deployments (best-effort; quota dependent).
4. Configure App Settings.
5. (Code) PWA: improve manifest, offline fallback in SW, dynamic OG image.
6. (Code) SEO: sitemap.ts, robots.ts, wire metadata into marketing pages.
7. Validate (`next build`) + azure-validate.

## 8. Risks / Notes
- better-sqlite3 native build on App Service Oryx; if problematic, switch to Container Apps.
- Azure OpenAI gpt-4o may require quota approval; fallback to gpt-4o-mini or eastus.
- SQLite on local disk is ephemeral; document managed-DB path for production.
