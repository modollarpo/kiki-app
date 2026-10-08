# Verification — Phase 0 Audit Remediation

> Date: 2026-10-08 · Scope: de-fabrication of stub data, contract alignment, realtime wiring, and full verification gauntlet.

## 1. What Changed

### De-fabricated API routes
Fabricated or mocked values removed; routes now return real data or explicit empty/demo states:

| Route | Previous | Now |
|---|---|---|
| `GET /api/status` | Crash → `services: []` when a table was absent from the mock | Defensive `?.c ?? 0` count reads; always returns 12 honest services |
| `GET /api/mmm-analysis` | Fabricated recommendations, budgets, projected ROAS, confidence | `{ channels: [], recommendations: [], modelFit: null }` until real MMM runs |
| `GET /api/attribution` | Fabricated fallback | `{ data: [] }` (empty) |
| `GET /api/profit-margin` | Fabricated summary/distribution | Zeroed summary + empty distribution |
| `POST /api/influencer/dark-social` | Hardcoded `avgOrderValue = 68.5`, untyped `any` | Typed `DarkSocialEvent`; `avgOrderValue` derived from real revenue (or `null`); `estimatedRevenue` sums actual revenue |
| `GET /api/margin` | Missing gross profit / honest CAC | Added `grossProfit` (= net) and `profitAdjCAC = max(0, (2*spend − revenue)/conversions)` |

### Frontend honesty
- Command Center (`/dashboard`): real SSE wiring via `useSSE("/api/events", token)` + `subscribe` to `agent:started/completed/error` → toast + data refresh. Fake LIVE badges replaced with `connected ? LIVE : STANDBY`.
- Reports / Workflow pages: removed fabricated LIVE badges and hardcoded `active: true` states; "active rules" → "action types"; removed `budgetSaved` stat (was fake `null` data).
- Profit-margin / creative-attribution pages: check `data.ok` (were checking nonexistent `.success` → never loaded), added demo/not-configured banners, auto-load on mount.

### API contract fixes
- `src/lib/api.ts`: `attribution.breakdown` and `influencer` wrapper types corrected from `{ success }` to `{ ok }`.
- `.success` → `.ok` sweep across: `auth/callback/[platform]`, `b2b`, `crm`, `settings`, `influencer`, `mmm`, `margin`.

## 2. Road Fixes Discovered During Verification

- **`/api/status` 500 root cause**: not the dynamic import — `ltv_predictions` was absent from the test mock, so `.c` on `undefined` threw. Fixed with defensive reads.
- **Local sqlite stale schema**: `data/kiki-local.sqlite` (dev fallback) predated DDL columns. `CREATE TABLE IF NOT EXISTS` never alters existing tables and `runMigrations` was additive-only. **Added idempotent migrations**: `users.trial_ends_at`, `users.status`, `users.updated_at`, `contacts.tenant_id`, `wallet_cards.issuer`, `wallet_cards.issuer_card_id`. Without these, `POST /api/arbitrage/run` and tenant-scoped `GET /api/contacts` 500ed locally.
- **Arbitrage SQL portability**: `platform-arbitrage.ts` used Postgres-only `SELECT DISTINCT ON` + `INTERVAL` syntax which crashed sqlite (`near "ON": syntax error`). Rewritten to dialect-agnostic `GROUP BY` + computed ISO cutoff.

## 3. Verification Results

| Check | Result |
|---|---|
| `npm run type-check` | ✅ 0 errors |
| `npm run lint` | ✅ No ESLint warnings or errors |
| `npm run test` | ✅ 177 passed, 22 skipped, 0 failed |
| `npm run build` | ✅ Full route compilation |
| Dev smoke (local sqlite, port 3100) | ✅ |

Dev-server smoke matrix (real HTTP against running server):

| Endpoint | Result |
|---|---|
| `POST /api/auth/signup` (new user) | ✅ 201, token issued |
| `POST /api/auth/login` | ✅ 200 |
| `GET /api/status` | ✅ 200 — `services: 12` |
| `GET /api/dashboard` | ✅ 200 — 0 agents, wallet $1000 (honest new-tenant state) |
| `POST /api/arbitrage/run` | ✅ 200 — 0 decisions (no cross-platform opportunity) |
| `POST /api/contacts` (anonymous) | ✅ 201 — public lead capture, `tenant_id NULL` |
| `GET /api/contacts` (auth) | ✅ 200 — tenant-scoped |

## 4. Known Limits (recorded, not regressions)

- `test/connectors.test.ts` — Shopify `generateOAuthUrl` test intermittently exceeds the 5000ms vitest timeout under full-suite load; passes in isolation (~1.5s). Load-flakiness, not a code regression.
- Vitest runs with `node:sqlite` unavailable, so it uses the in-memory fallback DB, which cannot execute some statement types (DB-dependent paths hang and time out). DB paths are verified against the real sqlite file via the live dev server instead.
- `data/kiki-local.sqlite` is a local dev artifact and is gitignored; production (Neon) already has the full DDL and additive migrations are no-ops there.

## 5. Re-run Commands

```bash
npm run type-check
npm run lint
npm run test
npm run build
npm run dev   # then exercise /api/*, ensuring { ok: true } envelopes
```