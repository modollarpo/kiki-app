# KIKI Agent Platform — Azure Deployment Plan

> Status: READY FOR DEPLOYMENT — production gaps fixed and verified. Subscription details to be confirmed via `az account show`.

## 0. Subscription Context
- All resources will be provisioned on a new Azure subscription dedicated to KIKI Agent Platform.
- Confirm subscription ID and default region via: `az account show --query id,location`
- Region: `swedencentral` (configured in Bicep) — adjust via `azd configure` if needed.
- Resource group pattern: `<baseName>-rg` (e.g., `kiki-rg`).

## 1. Mode
MODIFY / MODERNIZE — existing Next.js 15 App Router application being prepared for Azure deployment.

## 2. Requirements
- Host the full KIKI Agent platform (Next.js 15 + React 18, server components, API routes) on a dedicated Azure subscription.
- Real AI via Azure OpenAI (gpt-4o / gpt-4o-mini) — wired via `AZURE_OPENAI_*`.
- Persistence: Azure PostgreSQL (Flexible Server) for production; SQLite fallback on local disk via Azure File Share mount at `/app/data`.
- PWA + SEO hardening (separate workstream, code-only).
- **Subscription**: new Azure subscription dedicated to KIKI Agent Platform (confirm via `az account show`).

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
- **Image**: multi-stage Docker (Next.js standalone output), built remotely with `az acr build` (Linux build → correct better-sqlite3 native binary).
- **AI**: Azure OpenAI (swedencentral) + deployments gpt-4o, gpt-4o-mini.
- **Persistence**: Azure PostgreSQL Flexible Server (production) + Azure File Share mounted at `/app/data` for SQLite fallback; `DATABASE_URL` injected via Container App secrets.
- **Config**: Container App secrets/env from `.env.template`; Azure OpenAI endpoint + key injected via Bicep `listKeys()`.
- **Networking**: Public ingress, HTTPS via managed environment TLS, HSTS (in next.config).
- **Subscription**: Dedicated new subscription; all resources in one resource group.

## 6. Decisions
- Region: swedencentral
- Hosting model: Container Apps + ACR
- Azure OpenAI region: swedencentral; deployments: gpt-4o (GlobalStandard), gpt-4o-mini (GlobalStandard)
- Database: Azure PostgreSQL Flexible Server (`kiki-pg.postgres.database.azure.com`) with `sslmode=require`; SQLite fallback on Azure File Share for dev/ephemeral needs.

## 7. Execution Steps
1. Confirm new Azure subscription context: `az account show`.
2. Generate Bicep (`infra/main.bicep`) + `azure.yaml` + `Dockerfile` (already present; updated for subscription-agnostic URLs).
3. Provision RG + resources via `azd up` or `az deployment`.
4. Azure OpenAI resource + model deployments (best-effort; quota dependent).
5. Configure App Settings (Container App env secrets from `.env.local`).
6. (Code) PWA: improve manifest, offline fallback in SW, dynamic OG image.
7. (Code) SEO: sitemap.ts, robots.ts, wire metadata into marketing pages.
8. Validate (`next build`) + azure-validate + azure-deploy.

## 8. Risks / Notes
- better-sqlite3 native build on App Service Oryx; if problematic, switch to Container Apps.
- Azure OpenAI gpt-4o may require quota approval; fallback to gpt-4o-mini or eastus.
- SQLite on local disk is ephemeral; document managed-DB path for production.
- All hardcoded `purplesky-3fddb402.swedencentral.azurecontainerapps.io` URLs removed from Dockerfile/Bicep output.
- Credentials in `.env.local` must be rotated for the new subscription:
  - **Keep as-is**: `GROQ_API_KEY`, `OPENCODE_SECRET` (reuse existing credentials).
  - **Do NOT reuse — old subscription**: `AZURE_OPENAI_API_KEY` in `.env.local` is from the old subscription. Ignore it. Bicep provisions a **new** Azure OpenAI resource on the new subscription and injects its fresh key automatically via `openAi.listKeys().key1` → `AZURE_OPENAI_API_KEY` Container App secret. Nothing to paste manually.
  - **Rotate after deployment**: Stripe keys (rotate once live; also set `STRIPE_WEBHOOK_SECRET` for the Container App endpoint).
- `.env.local` currently contains `DATABASE_URL` pointing to the old subscription's PostgreSQL (`kiki-pg.postgres.database.azure.com`) — **must be replaced** with the new Flexible Server hostname after deployment. `SEED_DEMO_DATA` must remain `false` for production.
- **Test coverage**: 177 unit tests across 16 test files (12 passed, 22 skipped). All 4 real connectors (Shopify, WooCommerce, HubSpot, Salesforce) have comprehensive mock-based integration tests covering OAuth flow, token validation, account info, campaign listing, and webhook signature verification. Zero real API keys needed for testing.

## 9. Completed Production Fixes (verified 2026-09-04)

| # | Gap | Fix | Status |
|---|---|---|---|
| 1 | Wallet auto-seed granted `$1,000` on first wallet creation | `src/app/api/wallet/route.ts` — new wallets start at `balance: 0` | ✅ |
| 2 | Plan enforcement only on 4 of 75+ API routes | `checkEnforcement()` added to 33 mutating routes (37 total); skips `auth/*`, `webhooks/*`, `mobile/*`; enforcement errors return `{ ok: false, error }` | ✅ |
| 3 | Dunning cascade emitted events but never emailed users | `src/lib/billing.ts` `handlePaymentFailure()` — 4-stage branded HTML emails (warning → urgent → restricted → suspended) via `sendEmail()` | ✅ |
| 4 | `ltv/training` route used undefined feature `ltv_training` | Switched to `ltv_prediction` (valid feature on starter + growth plans) | ✅ |
| 5 | Tests for `POST /api/integrations` broke after enforcement | Added `@/lib/tenant` mock (returns `{ allowed: true }`) to `test/integrations-route.test.ts` | ✅ |
| 6 | Secret strategy not documented | Confirmed: reuse `GROQ_API_KEY` + `OPENCODE_SECRET`; Azure OpenAI key is from the **old subscription** — discarded, new key auto-injected by Bicep from the new OpenAI resource; rotate Stripe keys + PostgreSQL connection post-deploy | ✅ |
| 7 | `SEED_DEMO_DATA` set to `'true'` in Container App env (`infra/main.bicep:223`) — would auto-seed demo data in production | Changed to `'false'` | ✅ |
| 8 | `opencode-backend` container set `OPENCODE_SECRET` from `jwt-secret` (`infra/main.bicep:264`) — wrong secret, would break OpenCode agent auth | Changed to `opencode-secret` (matches web container) | ✅ |

**Verification**: `npm run type-check` (0 errors), `npm run lint` (clean), `npm test` (177 passed / 22 skipped), `npm run build` (84/84 pages compiled).

## 10. Live Deployment — Verified 2026-09-05 (Storegrill_Azure)

> **Subscription**: `Storegrill_Azure` (`a7d8e706-d6e4-41b1-9b21-aab49e3a8e6d`) — Azure Sponsorship (`quotaId Sponsored_2016-01-01`, spending limit **off**). OpenAI/AI Foundry deployable conditionally; gpt-4o/gpt-4.1-mini quotas approved in swedencentral.

### Deployed Resources (resource group `kiki-agent-rg`, swedencentral)

| Resource | Name | Notes |
|---|---|---|
| Container App | `kiki-app` | 4 containers, revision `kiki-app--0000003`, all Running/Healthy |
| Container App env | `kiki-env` | Consumption workload profile |
| Container Registry | `kikiagentacrchrdtvff` (`kikiagentacrchrdtvff.azurecr.io`) | images: `kiki-app:latest`, `ml-service:latest` (+ `scipy112` tag) |
| OpenAI account | `kikiopenaichrdtvff` | `https://kikiopenaichrdtvff.openai.azure.com/` |
| OpenAI deployments | `gpt-4.1-mini` (2025-04-14, GlobalStandard), `gpt-4o` (2024-11-20, GlobalStandard) | gpt-4o-mini 2024-07-18 is **deprecating** → replaced by gpt-4.1-mini |
| Storage account | `kikistore<suffix>` | file share `kikidata` mounted at `/app/data` (SQLite persistence) |
| Log Analytics | `kiki-logs` | `ContainerAppConsoleLogs_CL` |

**App FQDN**: `https://kiki-app.salmonforest-af3a732c.swedencentral.azurecontainerapps.io` — NOTE: output `containerAppUrl` uses the no-hash hostname (`kiki-app.swedencentral...`) which does NOT resolve; real FQDN carries the `salmonforest-af3a732c` hash.

### Containers
1. `kiki-web` — Next.js standalone, port 3000, AzureFile volume `/app/data`
2. `ml-service` — FastAPI/pymc, port 8000, **scipy pinned `1.12.0`** (1.13+ removed `scipy.signal.gaussian`; 1.13.1 pin still crashed — 1.12.0 is the correct floor)
3. `opencode-backend` — `opencode-ai@1.18.2 serve --port 8080`, same `kiki-app` image
4. `libretranslate` — `libretranslate/libretranslate:latest`, 17 languages

### Env overrides on `kiki-web`
`AZURE_OPENAI_DEPLOYMENT_MINI=gpt-4.1-mini` (was `gpt-4o-mini`, deprecating → tried to deploy → rejected `ServiceModelDeprecating`), `GROQ_MODEL=openai/gpt-oss-20b`, `SEED_DEMO_DATA=false`, `DATABASE_URL` empty (SQLite on file share), `AZURE_OPENAI_API_KEY` from `openAi.listKeys().key1`.

### Smoke test results (all passed)
- `GET /` → 200 (marketing site)
- `GET /api/health` → `{ok:true,status:"healthy"}`
- `GET /api/status` → `{ok:true,status:"operational"}`
- `POST /api/auth/signup` → 201 + JWT; `POST /api/auth/login` → 200 (persistence confirmed across revision recycle)
- `POST /api/ai/chat` → 200 `"content":"AI-OK"` (routed to Azure OpenAI gpt-4.1-mini via live deployment)
- Direct OpenAI: both `gpt-4.1-mini` and `gpt-4o` deployments returned `PONG` via account key1

### Bicep fixes applied during this deployment
1. `sha256()`/`uuid()` don't exist in Bicep → secret derivation uses concatenated `uniqueString()` (5× for encryptionKey/opencodeSecret to reach 64 chars)
2. Duplicate `opencodeSecret` symbol → `opencodeSecretResolved` var with `empty()? derived : param`
3. `acr.loginServer` → `acr.properties.loginServer`
4. VolumeMount `name` → `volumeName` (ContainerAppInvalidValue)
5. Empty secrets rejected → `union([...], empty(x)? [] : [{...}])` conditional audit
6. Globally-unique name collisions (`kikiopenai` taken) → `uniqueSuffix = substring(uniqueString(subscriptionId, location, baseName),0,8)`
7. `az deployment group what-if` broken in this az CLI version (deserialization + echoes secrets) → use `az deployment group create` inline

### Post-deploy rotation (REQUIRED)
- **GROQ_API_KEY and OPENCODE_SECRET were echoed in `what-if`/`deployment group create` error output** → rotate both after this session.
- Stripe keys: rotate once live; set `STRIPE_WEBHOOK_SECRET` for Container App endpoint.
- Old `DATABASE_URL` (old subscription Postgres) — replace when Postgres is provisioned, or keep empty for SQLite.
