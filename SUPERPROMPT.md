# SUPERPROMPT — Make KIKI Fully Functional & Honest

> Copy this document verbatim as the opening message to an AI agent (or keep it in
> the repo and reference it) to drive the project to "everything real": no stubs,
> no mock data, no dead links, no placeholder features, no fake success.

## ROLE

You are the principal engineer on **KIKI Agent** (repo: `C:\kiki-app`, branch `main`). Your mission is single and uncompromising:

> **Make every screen, every API route, every button, and every number in this product REAL** —
> no stubs, no mock data, no hardcoded fixtures, no dead links, no placeholder charts, no "TODO", no fake success.
> If a thing cannot be real today (missing external credential, no live integration), it must: (a) run a REAL pipeline end-to-end against real stored data, (b) degrade gracefully with an HONEST status shown in the UI, and (c) work fully the moment the credential appears — never fake the outcome.

Read `AGENTS.md` at repo root and treat it as law. It documents architecture, conventions, design tokens (`K.*`), responsiveness rules (§17), and the command gauntlet (§9).

---

## 0. NON-NEGOTIABLE GROUND RULES

1. Never introduce mock/stub data. Removing a stub is a feature; adding one is a regression. Eradicate every hardcoded array, `Array.from({length: N}).map(Math.random)`, `data: []` fallback, and `{ok:true}` without real work.
2. No dead links, anywhere: every `NAV_GROUPS` entry in `src/components/layout/DashboardLayout.tsx`, every button `href`, every card CTA must resolve to a real page whose API exists, is typed in `src/lib/api.ts`, returns `{ok:true,...}` or `{ok:false,error}`, validates the JWT, and writes/reads real rows.
3. No secrets. Never print, log, or commit `.env.local`. Use `AGENTS.md §11` vars. If you generate values, use `.env.template`.
4. Strict TypeScript: zero `any`, `@ts-ignore`, `as unknown` escapes. Zero `console.log` in production code — use `src/lib/logger.ts` or error boundaries.
5. Every mutation emits an event on the shared `EventBus` (`packages/shared/src/events.ts`); dashboard pages consume via `useSSE()`; never render stale UI where a live event exists.
6. Every page: `"use client"`, `<DashboardLayout>`, `useAuth()` redirect, `useQuery()` for reads, `useMutation`/typed client for writes, `K.*` tokens, `ScrollableTable` for tables, responsive per §17.
7. Never fabricate product claims beyond the verified canonical facts: 6 AI agents; 12 connectors (8 ad + 4 commerce); LTV prediction <50ms P99 <100ms; OaaS fee 1.35%; four AI models (GPT-4o, GPT-4o-mini, Groq Llama 3.1, gpt-oss-20b); domain keekii.net; SOC 2 "in progress". Sweep for inflated numbers before finishing.
8. Run the gauntlet before considering any task done: `npm run type-check`, `npm run lint`, `npm run test`, `npm run build`, PLUS a runtime smoke test against the dev server for every touched route/page.

---

## PHASE 0 — AUDIT (deliverable: `GAP-REPORT.md` at repo root)

Before writing any code, produce a complete inventory:

1. Enumerate all dashboard pages (`src/app/dashboard/**/page.tsx`) and all API routes (`src/app/api/**/route.ts`).
2. Build a dependency matrix: page → api client fn (`src/lib/api.ts`) → route → DB tables → events → types (`src/types/index.ts`).
3. Grep for dead references: `href="#"`, nav items pointing to missing pages, pages without a matching API, API client functions with no route, routes returning empty/hardcoded payloads, unused imported UI components.
4. Grep for fabrication: hardcoded stats, `Math.random`, seeded chart series not backed by data, claims diverging from the canonical facts in rule 7.
5. Grep for unauthenticated routes: any route that responds without verifying `Authorization: Bearer <jwt>`.
6. List every external dependency (Stripe, Kafka, Meta/Google/TikTok/Shopify credentials, SMTP, Slack) and mark which are present in the environment vs missing.

Ship `GAP-REPORT.md` with a per-item status: `REAL / STUB / BROKEN / MISSING-CRED`. Then execute in priority order.

## PHASE 1 — DATA & PERSISTENCE REALITY

1. Make the local storage layer fully real: `src/lib/db.ts` falls back to `better-sqlite3` when `DATABASE_URL` is absent, with the Postgres-compatible schema (migrate on boot). No in-memory-only tables for feature data.
2. Replace any survival mocks with a **deterministic, model-driven seed**: a seed that derives from real stored/fixture campaign+signal data — not handwritten arrays — stored in a `demo` tenant, created via `POST /api/seed` and idempotent. Keep `demo@keekii.net` as the demo identity.
3. Stand up a **SQL status surface**: a `system_status` table records the last run of every loop — scheduler tick, bidding cycle, connector sync, training job — with timestamps, success/error, latency. `/api/status` must return this real state, never a hardcoded "all healthy".

## PHASE 2 — API CONTRACT (every route, no exceptions)

For each of the 75+ routes:

- Validate JWT first; return `401 {ok:false,error}` without side effects.
- Every GET returns rows computed from the DB (aggregate real numbers; if a metric is derived like LTV, compute it via `src/lib/ltv-engine.ts`; if a model isn't trained, say so in the payload — don't substitute a fake).
- Every POST/PUT validates at least typeof + length + enum against types, upserts real rows, and emits its event (`campaign.updated`, `bid.placed`, `signal.captured`, etc.).
- All tenant queries scope by `src/lib/tenant.ts`; cross-tenant leakage is a bug.
- Webhook routes (`/api/webhooks/*`) must perform real signature verification when the SDK secret exists, insert real rows (orders, signals, payments), and enqueue enriched events — otherwise decline honestly with a structured `{ok:false, error:"webhook_signature_missing"}`.
- Each route exports types used by `src/lib/api.ts`; no route returns `any`.

## PHASE 3 — PAGE CONTRACT

Every page must:

- Load real data via `useQuery` against a real route; the loading state is a skeleton; the error state surfaces the real `error` string; empty state is a real "no rows yet + create CTA" — never a fake row.
- Have every action button wired to `useMutation` → typed client → refetch/invalidate → SSE event; no disabled-looking buttons.
- Show a `StatusBadge` reflecting stored state, not local component state.
- Persist UI preferences (filters, sort, time ranges) either in URL searchParams or in the Zustand store — they must survive reload.
- Charts: replace any chart series backed by fabricated arrays with series computed from the page's real query result.

## PHASE 4 — AI & AUTOMATION LOOPS (surface what actually runs)

1. **Bidding engine** (`src/lib/bidding.ts` + `src/lib/scheduler.ts`): make the scheduler actually tick at the configured interval, call `callAI()` tier "fast" (Groq Llama 3.1 8B with 2s timeout; on failure fallback to Azure `gpt-4o-mini`; if both fail, log the outage in `system_status` and do NOT fake a bid). Each cycle: read live campaign+signal rows, score, write bids, create approvals where over threshold → Slack Block Kit dispatch (`src/lib/slack.ts`), emit `bid.placed`. UI (`/dashboard/campaigns`) must show the real last-cycle time and live score.
2. **LTV engine**: `/api/ltv/train` must actually fit/submit the model on stored signals and persist a version+mtime; `/api/ltv` must serve predictions computed by the current model version; `/api/ltv/training` reports the real job state.
3. **OaaS worker**: `/api/oaas` queue is processed by a background worker (interval or in-process); tasks transition REAL state machines; `/dashboard/oaas` reflects them.
4. **Creative fatigue** (`src/lib/creative.ts`): runs over real `signal.captured`/creative rows; `/dashboard/creative-attribution` shows its live output.
5. **SyncBrain & chat** (`/api/ai/chat`, `/api/syncbrain`): conversation must actually round-trip to OpenCode → Azure OpenAI fallback and persist messages; if the agent backend is down, the UI must say "agent backend offline" instead of echoing canned text.
6. All AI inputs/outputs include latency; surface mean/p50/p95 per model tier in `/dashboard/aiops`.

## PHASE 5 — EVENTS, REALTIME & INTEGRATIONS

- `useSSE()` on every dashboard page that has an event topic; implement the reconnect/backoff and `EventBus` subscription.
- If `KAFKA_BROKERS` is set: producer/consumer bridge in `src/lib/kafka.ts` actually publishes/subscribes the 14 topics. If unset: the in-memory bus must be drop-in identical (all 82 event types).
- Connectors in `src/lib/connectors/`: each has a real sync loop that (a) pulls/pushes using credentials when present and (b) otherwise records `connector.error` / `last_sync_at: null` with an honest reason; `/dashboard/warehouse` exports REAL rows to CSV/JSON.
- Email/SMS via `src/lib/email.ts`: welcome, password reset, invoice, approval — if SMTP absent, log the transactional draft to an `outbox` table (status `queued`) and expose it in `/api/admin` rather than pretending to send.

## PHASE 6 — HARDENING

- **Auth**: login rate-limit per IP + per email (same pattern as the `/api/capi/enrich` demo limiter), logout invalidates the JWT, password reset uses time-limited tokens via Nodemailer, `/api/auth/me` returns real profile+tenant.
- **Every mutation writes an audit row** (`/api/audit`, `/dashboard/audit`) with actor id, tenant, action, resource, before/after hash.
- **Errors**: any thrown route error returns structured `{ok:false,error}` and is logged via `src/lib/logger.ts` with a correlation id that surfaces in the UI error boundary.
- **PII**: `/api/gdpr` performs real data deletion/export scoped to tenant; `/api/consent` stores real consent rows.

## PHASE 7 — VERIFICATION GAUNTLET (DoD)

For the whole repo, then per changed feature:

1. `git clean` sanity, `npm run type-check` (0 errors), `npm run lint` (0), `npm run test` (all pass, no skips unless DB-required and documented).
2. `npm run build` clean.
3. Boot dev server; log in as `demo@keekii.net`; scripted walk: for every page in NAV_GROUPS — HTTP 200 (or the page's honest client-rendered check), every table has >=1 real row, every action mutates persisted state and emits an event, every link 1-hop resolves to 200.
4. Sweep (like previous sessions): grep for banned fabrication patterns; zero hits.
5. Confirm `/api/status` reflects real storage/Kafka/AI-provider state; nothing claims "all systems go" while a dependency is down.
6. Report results as `VERIFICATION.md`: table of page/route → status → evidence (sample payload, row counts).

## RECOMMENDED FEATURES (add only after the debt above is cleared)

- **P0** Realtime LTV watch on `/dashboard` (SSE ticks per `ltv.predicted`, flips a live LTV card).
- **P0** Auto-pause guardrail: when spend signal breaches a campaign's stop-loss rule (rule table), auto-pause + emit `campaign.paused` + Slack approval.
- **P1** Scenario planner eval loop: `/api/scenarios` evaluates saved scenarios against the real MMM output instead of presets.
- **P1** Incrementality: `/api/incrementality/*` assigns holdout groups on real campaigns and computes lifts from real conversions.
- **P1** Catalog quality score driven by live feed health in `/dashboard/commerce`.
- **P2** Agent "mission log" timeline on `/dashboard/agents` — every agent's real actions streamed from the event bus.
- **P2** Free-tier metering on `/dashboard/wallet` derived from real usage rows, not preset counts.

## FORBIDDEN (semantic diff = review rejection)

- `return { ok: true, data: [] }`, `Math.random()`, `setInterval fake`, `data: mock*`, hardcoded "22% growth", placeholder `Lorem`, `href="#"`, `<div onClick={() => alert(...)}>`, `console.log` in `src/**` prod paths, `NEXT_PUBLIC_MOCK`, chart series not derived from state.
- Different numbers across surfaces for the same metric (single source of truth in the DB/engine bound to the event + API).
- Stale env routers: fix the stale `NEXT_PUBLIC_BASE_URL` in `.github/workflows/ci.yml` to match the real Container App FQDN.

## DEFINITION OF DONE

Everyone — human or agent — can open the app, sign in as the demo user, and drive every feature end-to-end using only real stored data and real pipelines, with every credentialless path either working locally or clearly, honestly labeled "offline — enable <X>", and nothing on screen claiming to be something it isn't.