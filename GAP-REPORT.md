# GAP-REPORT — KIKI "Make Everything Real" Audit (Phase 0)

Generated: 2026-10-08 · Method: 3 parallel read-only audits (pages/nav/fabrication, API routes/auth/stubs, types/events/store)
Status legend: `REAL` working as intended · `STUB` fabricated/demo data presented as live · `BROKEN` broken wiring · `DEBT` technical/logic debt · `MISSING-CRED` requires external credential

## Summary

| Area | Count | Notes |
|---|---|---|
| Dashboard pages audited | 42 | 42/42 `<DashboardLayout>` ✓, 42/42 auth ✓ |
| API route files | 101 | 86 force a credential; 15 public-by-design or gaps |
| Nav ↔ page resolution | 40/40 | Zero dead links; zero `href="#"` repo-wide |
| Route ↔ `api.ts` dead links | 0 | Every typed client path resolves |
| Fabrication hotspots (STUB) | 18 routes + 15 pages | See below |
| Security findings | 4 | See CRITICAL |
| Broken wiring | 4 | SSE auth, gdpr consent/export, mobile refresh, 3×401 client calls |
| TanStack Query usage | 0 files | AGENTS.md standard not actually applied (pages use raw fetch) |
| `any` tokens | 459 across 91 files | Concentrated in `lib/db.ts`, `lib/wallet.ts`, `lib/billing.ts`, connectors |
| SSE consumer pages | 1/42 (and that page subscribes to 0 events) | Realtime plumbed but unused |

---

## CRITICAL — Security

| # | Item | Evidence | Status | Fix |
|---|---|---|---|---|
| C1 | **Unsigned Slack webhook mutates campaigns** | `src/app/api/webhooks/slack/route.ts:20` `SIGNING_SECRET = process.env.SLACK_SIGNING_SECRET ?? ""`, `:29` `if (!SIGNING_SECRET) return true`, `:54` `UPDATE campaigns SET bid … WHERE id = ?` (no tenant predicate). `SLACK_SIGNING_SECRET` absent from env → any anonymous POST executes bid approvals + connector pushes | **BROKEN (critical)** | Fail closed when secret unset; tenant-scope the update; guard `timingSafeEqual` length mismatch |
| C2 | **SSE stream is guaranteed 401** | `useSSE.ts:17` sets `EventSource(url + "?token=")`; `lib/auth.ts:102` `getUserFromRequest` reads only `Authorization: Bearer`; `/api/events` gates on it → every connection 401s | **BROKEN** | Support `?token=` for GET `/api/events`; emit `{ok}` in frames; tenant-scope broadcast |
| C3 | **Mobile refresh tokens can never be refreshed** | Login signs with `REFRESH_SECRET` fallback `kiki-refresh-secret-2024`, omits `iss`/`aud`; refresh verifies vs `MOBILE_REFRESH_SECRET` fallback `kiki-mobile-refresh-secret-change-in-production` with required `issuer:'kiki-mobile', audience:'kiki-api'` → guaranteed 401 `TOKEN_EXPIRED` | **BROKEN** | Unify generated secret + add iss/aud claims |
| C4 | **gdpr consent / export / delete always 401** | `CookieConsent.tsx:56,61,66` POSTs `/api/gdpr` w/o token; `privacy/consent/page.tsx:197,208` same + `export` not handled by POST (`gdpr/route.ts:45-72`) | **BROKEN** | Attach token in UI; handle `export` in POST |

## HIGH — STUB / fabricated data presented as live

### API routes
| Route | Evidence | Status |
|---|---|---|
| `/api/status` | 12 hardcoded `{p99, uptime: 99.9x}` service rows (`:8-21`); anonymous + catch path report `operational` anyway (`:52-66`) | **STUB** — was already tight? no: still flagged |
| `/api/insights` | Invented sparklines `trend:[28,30,…]` (`:115`), index-derived task states (`:147`), `confidence: 75 + (i*3) % 20` (`:149`), fake `"${i+1} hr ago"` (`:150`), `fraudSavings = …*33.4` (`:165`), `uptime: 99.7` (`:204`) | **STUB** |
| `/api/dashboard` | Real KPIs but invented `delta: 10.8/14.2/8.3/12.1` (`:54-57`), `status:"nominal"` hardcoded (`:70`) | **STUB** |
| `/api/analytics` | `revenue = conversions * 14.8` (`:53`), `leads = clicks * 0.15` (`:60`), funnel from invented numbers (`:61-62`) | **STUB** |
| `/api/intelligence` | Hardcoded `confidence: 95/88/100/82/78/72` (`:46-102`), extrapolations `*1.1`/`*1.15` | **STUB** |
| `/api/scenarios` | Hardcoded confidences 85/72/78/65; projections `*1.35/*1.25/*1.15/*1.5` | **STUB** |
| `/api/oaas` | Invented `expectedImpact, 75 + (i*3) % 20` **inserted into DB** (`:24-30`) | **STUB** |
| `/api/competitive` | `benchmark` computed against itself; `industry: 0` (`:76-78`) | **STUB** |
| `/api/signup` | Every new account silently seeded with 2 fake campaigns + 3 fake signals, `ltv_predicted: 25 + i*10`, backdated ("makes dashboard look populated") | **STUB** |
| `/api/mmm-analysis` | `proxyToService` fallback: hardcoded budget recommendations, `confidence: 0.87`, `projectedRoas: 3.6` — returned as `ok:true` with no demo marker (`MMM_URL` unset) | **STUB (MISSING-CRED)** |
| `/api/profit-margin` | Same pattern: fabricated revenue/margins with campaign names (`PROFIT_MARGIN_URL` unset) | **STUB (MISSING-CRED)** |
| `/api/attribution` | Same pattern: breakdown Meta/Google/etc conversions/revenue/roas (`CREATIVE_ATTRIBUTION_URL` unset) | **STUB (MISSING-CRED)** |
| `/api/nl-query` | Proxy fallback answers (`NL_ANALYTICS_URL` unset) | **STUB (MISSING-CRED)** |
| `/api/influencer` | Proxy fallback fabricated creator roster (`INFLUENCER_URL` unset) | **STUB (MISSING-CRED)** |
| `/api/influencer/dark-social` | `avgOrderValue = 68.5` fallback (`:47`) | **STUB** |
| `/api/agents` | Guardrails fall back to literal `"$5,000"/"2.0×"/"$35"/"Strict"` (`:42-65`) | **DEBT** |
| `/api/transcribe` | `confidence: 0.95` constant on Groq path | **DEBT** |
| `/api/contacts` | GET `SELECT * FROM contacts` without `tenant_id` (`:48`) → cross-tenant read | **BROKEN** |

### Dashboard pages (front-end fabrication)
| Page | Evidence | Status |
|---|---|---|
| `/dashboard/agents` | `99.7%` stat (`:126`), static "Agent Config (Azure OpenAI)" block with `GPT-4o-mini/$0.01/3/30s` (`:192-198`), unconditional "no interventions needed" (`:187`) | **STUB** |
| `/dashboard/anomaly` | `94.7%` detection score + "AI model accuracy" (`:53`) | **STUB** |
| `/dashboard/fraud` | Detection `totalDetected/(totalDetected+10000)` invented denominator + `"0.08%"` fallback (`:62`), `dataQualityScore || 99.1` + `delta 0.3` (`:63`), always-`PROTECTED` badge (`:57`), hardcoded 6 rule names (`:38`) | **STUB** |
| `/dashboard/admin` | `uptime` derived from unrelated metric (`:54`), region hardcoded (`:56`) | **STUB** |
| `/dashboard/aiops` | `latency: Math.random()*15+5 ms` (`:62`), scripted AI-thinking theater | **STUB** |
| `/dashboard/developer` | Random API keys (`:47`), fake `created:"Active"`/`lastUsed:"Recent"`, fallback 42ms latency | **STUB** |
| `/dashboard/settings` | Static security rows ("2FA Enabled", "2 active keys") (`:163`), hardcoded platform fallback list | **STUB** |
| `/dashboard/consent` | Regions hardcoded `compliance:0/consentRate:0` (`:48-53`); Privacy Sandbox statuses static (`:137-143`) | **STUB** |
| `/dashboard/creative-ai` | `value="6"` platforms, `value="GPT-4o"` (`:129-130`) | **STUB** |
| `/dashboard/competitor` | `value="6"` platforms protected (`:141`) | **STUB** |
| 11 pages (`campaigns`, `analytics`, `crm`, `margin`, `b2b`, `competitive`, `finance`, `kyc`, `workflow`, `reports`, `profit-margin`) | Hardcoded `delta={12.4/18.2/…}` trend numbers alongside real data | **STUB (deltas)** |
| `/dashboard/workflow` | `budgetSaved = 0` (deleted feature) → "Budget Saved" always $0 (`:29,:124`) | **DEAD** |
| `/dashboard/reports` | `scheduledReports = []` always empty under a `LIVE` badge (`:44,:109`) | **DEAD** |
| `/dashboard/profit-margin`, `/dashboard/creative-attribution` | No auto-fetch — zeros until a button is clicked | **DEAD** |

## MEDIUM — Contract / plumbing

- 24 routes return `{error}` without `ok:false` (contract violation): `arbitrage/*`, `attribution`, `catalog/*`, `crm`, `crm/sync`, `events`, `gdpr`, `incrementality/*`, `influencer`, `intelligence`, `ltv/train`, `ltv/training`, `metacognition`, `mmm-analysis`, `nl-query`, `profit-margin`, `signal`, `sync`, and all of `ai/chat` (which never emits `ok`).
- `api.ts` 401-guaranteed clients: `contacts.submit` (`:232`), `nlQuery.query` (`:607`), `metacognition.reflect` (`:633`) send no token; `ai/chat` 401s pre-login from `useAgentChat`.
- `PUT /api/settings` accepts `plan` from body → any user can self-escalate to `enterprise` (no billing gate).
- `forgot-password` / `reset-password` have no rate limits.
- Mobile: `mobile/v1/wallet/transactions`, campaign POST tenant checks OK; `/api/mobile/v1/analytics` empty fallback honest.
- `/api/events` broadcasts **all tenants'** events to every connected client (no tenant scoping).
- Event vocabulary is 3 disjoint sets (16 `kiki.*` Kafka topics / 15 `EVENTS` const / 29 ad-hoc strings); header comment "82 events, 14 topics" stale (actual 19 payloads / 16 topics); `src/lib/kafka.ts` does not exist; Next app never publishes to Kafka (only 6 microservices do).
- Only 2 `eventBus.on()` listeners exist (`lib/bidding.ts:609,618`); 56 emit sites → 2 listeners. SSE consumed by 0 pages.
- `src/lib/api.ts` is 71% dead: 44/62 client objects never imported; pages call raw `fetch` (35 files) — typed-client layer unused.
- `src/types/index.ts` 72% dead: 18/25 exports never imported; pages declare 60+ local duplicate interfaces; `api.ts` maintains a mirror type system (`status: string` vs union).
- `any` debt 459 tokens/91 files, concentrated in DB/connector/billing layers (dashboard pages nearly clean).
- `transcribe`/`translate` confidence + `competitive` external benchmark (industry CPM) are `MISSING-CRED` — honest only when a credential/provider exists.

## LOW — Doc drift vs AGENTS.md

- AGENTS §4 lists `workflow`, `reports`, `mmm`, `scenarios` as GET/POST — they are GET-only.
- AGENTS §16 claims `src/lib/kafka.ts` exists — it does not.
- AGENTS §2 claims TanStack Query + `useSSE` on "dashboard pages" — 0 useQuery, 1/42 useSSE.
- AGENTS §17 references Zustand `sidebarOpen` — actual state is `sidebarCollapsed`.
- `packages/shared/src/events.ts` "14 topics / 82 events" comment stale.

## Required external credentials (MISSING-CRED) for 5 service routes
`MMM_URL`, `PROFIT_MARGIN_URL`, `CREATIVE_ATTRIBUTION_URL`, `NL_ANALYTICS_URL`, `INFLUENCER_URL` — all unset → `lib/service-proxy.ts:40-44` serves hardcoded fallback masked as real data. These must at least be marked `demo: true` / `mode: "offline"` until configured.

## Priority execution plan
1. Fix CRITICAL (C1–C4) — Slack webhook, SSE auth, mobile refresh, gdpr. (DONE below)
2. De-fabricate `/api/status`, `/api/dashboard` deltas, `/api/insights`, `/api/competitive`, `/api/signup`, `/api/oaas` and the 5 proxy routes (mark `demo`/`offline`).
3. Wire realtime: subscribe Command Center to live events; make `/api/events` tenant-scoped.
4. Fix `{error}`-without-`ok` contract on the 24 routes (spot-fix high-traffic ones; sweep others).
5. Frontend sweep: remove fabricated stats/deltas/static claims (see HIGH above); fix `profit-margin`/`creative-attribution` auto-load; drop `reports` LIVE badge on empty list.
6. Contract: scope `/api/contacts` GET by tenant; block plan self-escalation; rate-limit forgot/reset password.
7. Reduce `any` (DB layer) and migrate high-traffic pages to typed clients — rolling debt project.
8. Re-run gauntlet + write `VERIFICATION.md`.