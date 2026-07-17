# KIKI Agent Platform — AI Builder Operating Manual

> **Purpose**: This document is the single source of truth for any AI agent or human developer working on KIKI. Follow it exactly. Do not improvise.

---

## 1. Project Identity

**KIKI Agent™** — Autonomous LTV Campaign Execution Platform  
**Stack**: Next.js 15 + TypeScript (strict) + React 18 + Tailwind CSS + Zustand + TanStack Query  
**Database**: PostgreSQL (Neon) + better-sqlite3 (local fallback)  
**Event Bus**: Kafka (KafkaJS)  
**AI Stack**: Groq (Llama 3.1 — fast bidding), Azure OpenAI (GPT-4o-mini / GPT-4o — heavy processing), OpenCode SDK (conversational agent)  
**Auth**: Custom JWT (login/signup/logout, no NextAuth)  
**Infra**: Azure (Bicep), Docker, Container Apps

---

## 2. Architecture Map

```
src/
├── app/
│   ├── page.tsx                    # Marketing landing
│   ├── auth/login/page.tsx         # Login
│   ├── auth/signup/page.tsx        # Signup
│   ├── dashboard/                  # 42 dashboard pages (see §3)
│   └── api/                        # 55+ REST routes (see §4)
├── components/
│   ├── ui/                         # StatCard, Card, Badge, Button, ProgressBar, AIThinking, StatusBadge
│   ├── layout/
│   │   ├── DashboardLayout.tsx     # Sidebar + command palette + mobile nav
│   │   └── MarketingLayout.tsx     # Public site layout
│   ├── dashboard/                  # Feature components (OnboardingChecklist, etc.)
│   ├── marketing/                  # Landing page sections
│   └── providers/                  # ThemeProvider, QueryProvider
├── hooks/
│   ├── useAuth.ts                  # Auth state + token
│   ├── useSSE.ts                   # Server-Sent Events connection
│   └── useAgentChat.ts             # OpenCode chat hook (messages, sendMessage, isStreaming)
├── lib/
│   ├── api.ts                      # Typed fetch wrappers for all API routes
│   ├── groq.ts                     # Groq API client (fast tier)
│   ├── opencode.ts                 # OpenCode client (agent backend)
│   ├── azure-openai.ts             # Azure OpenAI client (mini/standard tiers)
│   ├── agents.ts                   # 6 AI agents + callAI() dual-path
│   ├── bidding.ts                  # Bidding engine (Groq batch scoring + heuristic fallback)
│   ├── scheduler.ts                # Cron-like scheduler (configurable interval)
│   ├── kafka.ts                    # KafkaJS producer/consumer
│   ├── db.ts                       # PostgreSQL pool (or sqlite fallback)
│   ├── tenant.ts                   # Multi-tenant context
│   ├── kdls.ts                     # Design tokens (K.mint, K.blue, etc.)
│   ├── contracts.ts                # PDF generation contracts
│   └── ...                         # 30+ lib modules
├── store/
│   └── index.ts                    # Zustand global store (agents, wallet, UI state)
├── types/
│   └── index.ts                    # Shared TypeScript types
├── hooks/
│   └── ...
├── packages/
│   └── shared/
│       └── src/
│           ├── events.ts           # 82 Kafka event types across 14 topics
│           └── index.ts            # EventBus for browser-side SSE
├── test/
│   └── pure.test.ts                # Vitest tests (skip DB-dependent)
├── infra/
│   └── main.bicep                  # Azure infra (Container App, DB, secrets)
├── proto/
│   └── kiki.proto                  # gRPC service definitions (design only, not implemented)
├── docker/
│   └── Dockerfile                  # Multi-stage production build
└── .env.local                      # Active config (NEVER commit secrets)
```

---

## 3. Dashboard Pages (42 routes)

Every page lives under `src/app/dashboard/[slug]/page.tsx`. All use `"use client"` and wrap content in `<DashboardLayout>`.

| Group | Route | Page | Status |
|---|---|---|---|
| **OVERVIEW** | `/dashboard` | Command Center (home) | ✅ Live |
| | `/dashboard/campaigns` | Campaign Manager | ✅ Live |
| | `/dashboard/signals` | Signal Stream | ✅ Live |
| | `/dashboard/agents` | AI Agents | ✅ Live |
| | `/dashboard/guides` | Guides (3 sub-pages) | ✅ Live |
| **INTELLIGENCE** | `/dashboard/syncbrain` | SyncBrain™ (AI chat) | ✅ Live |
| | `/dashboard/analytics` | Performance Analytics | ✅ Live |
| | `/dashboard/competitive` | Competitive Intel | ✅ Live |
| | `/dashboard/scenarios` | Scenario Planner | ✅ Live |
| | `/dashboard/mmm` | Media Mix Modelling | ✅ Live |
| | `/dashboard/b2b` | B2B Attribution | ✅ Live |
| **FINANCE** | `/dashboard/wallet` | Wallet & Cards | ✅ Live |
| | `/dashboard/billing` | Billing | ✅ Live |
| | `/dashboard/margin` | Profit Margin | ✅ Live |
| | `/dashboard/profit-margin` | Profit & Margin | ✅ Live |
| | `/dashboard/finance` | Finance Ops | ✅ Live |
| | `/dashboard/influencer` | Influencers | ✅ Live |
| **OPERATIONS** | `/dashboard/oaas` | OaaS Tasks | ✅ Live |
| | `/dashboard/workflow` | Automation | ✅ Live |
| | `/dashboard/reports` | Reports | ✅ Live |
| | `/dashboard/warehouse` | Data Export | ✅ Live |
| | `/dashboard/fraud` | Fraud & IVT | ✅ Live |
| | `/dashboard/anomaly` | Anomaly Alerts | ✅ Live |
| **CRM & CONTENT** | `/dashboard/crm` | CRM | ✅ Live |
| | `/dashboard/creative-library` | Creatives | ✅ Live |
| | `/dashboard/creative-attribution` | Creative Attribution | ✅ Live |
| **SYSTEM** | `/dashboard/aiops` | AI Ops | ✅ Live |
| | `/dashboard/admin` | Admin Health | ✅ Live |
| | `/dashboard/developer` | Developer | ✅ Live |
| | `/dashboard/audit` | Audit Log | ✅ Live |
| | `/dashboard/consent` | Consent & Privacy | ✅ Live |
| | `/dashboard/agency` | Agency View | ✅ Live |
| | `/dashboard/settings` | Settings | ✅ Live |

---

## 4. API Routes (55+ routes)

All routes live under `src/app/api/[slug]/route.ts`. Auth via `Authorization: Bearer <jwt>` header. Response format: `{ ok: boolean, ...data }` or `{ ok: false, error: string }`.

| Route | Method | Purpose |
|---|---|---|
| `/api/auth/login` | POST | Email/password login → JWT |
| `/api/auth/signup` | POST | Create account |
| `/api/auth/logout` | POST | Invalidate session |
| `/api/auth/me` | GET | Current user profile |
| `/api/dashboard` | GET | Dashboard KPIs + campaigns + agents + wallet |
| `/api/campaigns` | GET/POST | List/create campaigns |
| `/api/campaigns/[id]` | GET/PUT/DELETE | Single campaign CRUD |
| `/api/agents` | GET/PUT | List/update agents |
| `/api/bidding` | GET/POST | Bidding decisions + manual overrides |
| `/api/ai/chat` | POST | OpenCode → Azure OpenAI fallback |
| `/api/syncbrain` | GET/POST | SyncBrain stats + chat |
| `/api/signals` | GET/POST | Signal stream + CAPI events |
| `/api/signal` | GET/POST | Signal config + routing |
| `/api/ltv` | GET/POST | LTV predictions + customer profiles |
| `/api/ltv/train` | POST | Train LTV model |
| `/api/ltv/training` | GET | Training status |
| `/api/analytics` | GET | Performance analytics |
| `/api/intelligence` | GET | Competitive intel |
| `/api/scenarios` | GET/POST | Scenario planning |
| `/api/mmm` | GET/POST | Media mix modelling |
| `/api/mmm-analysis` | GET | MMM analysis results |
| `/api/b2b` | GET/POST | B2B attribution |
| `/api/wallet` | GET/POST | Wallet balance + transactions |
| `/api/billing` | GET/POST | Billing + invoices |
| `/api/margin` | GET | Profit margin analysis |
| `/api/profit-margin` | GET/POST | Profit & margin |
| `/api/commerce` | GET/POST | Commerce operations |
| `/api/influencer` | GET/POST | Influencer management |
| `/api/oaas` | GET/POST | OaaS task queue |
| `/api/workflow` | GET/POST | Automation workflows |
| `/api/reports` | GET/POST | Report generation |
| `/api/warehouse` | GET/POST | Data export |
| `/api/fraud` | GET/POST | Fraud detection |
| `/api/anomaly` | GET | Anomaly detection |
| `/api/crm` | GET/POST | CRM contacts |
| `/api/crm/sync` | POST | CRM sync |
| `/api/contacts` | GET/POST | Contact management |
| `/api/creative-library` | GET/POST | Creative assets |
| `/api/aiops` | GET | AI ops status |
| `/api/admin` | GET | Admin health |
| `/api/developer` | GET | Developer tools |
| `/api/audit` | GET | Audit log |
| `/api/consent` | GET/POST | Consent management |
| `/api/agency` | GET/POST | Agency view |
| `/api/settings` | GET/PUT | User settings |
| `/api/notifications` | GET/POST | Notifications |
| `/api/events` | GET | SSE event stream |
| `/api/status` | GET | System health |
| `/api/nl-query` | POST | Natural language query |
| `/api/metacognition` | POST | Self-reflection agent |
| `/api/integrations` | GET/POST | Platform integrations |
| `/api/sync` | POST | Data sync |
| `/api/incrementality/experiment` | POST | Incrementality testing |
| `/api/incrementality/results` | GET | Incrementality results |
| `/api/arbitrage/run` | POST | Run arbitrage cycle |
| `/api/arbitrage/history` | GET | Arbitrage history |
| `/api/catalog/stats` | GET | Catalog stats |
| `/api/catalog/evaluate` | POST | Catalog evaluation |
| `/api/capi/enrich` | POST | CAPI signal enrichment |
| `/api/attribution` | GET | Attribution analysis |
| `/api/gdpr` | POST | GDPR requests |
| `/api/webhooks/meta` | POST | Meta CAPI webhook |
| `/api/webhooks/google` | POST | Google Ads webhook |
| `/api/webhooks/tiktok` | POST | TikTok webhook |
| `/api/webhooks/snap` | POST | Snap webhook |
| `/api/webhooks/pinterest` | POST | Pinterest webhook |
| `/api/webhooks/linkedin` | POST | LinkedIn webhook |

---

## 5. AI Tier Routing

```
"fast"  → Groq Llama 3.1 8B  (bidding, real-time scoring, <200ms)
"mini"  → Azure GPT-4o-mini  (summaries, classifications, moderate tasks)
"standard" → Azure GPT-4o    (complex reasoning, planning, deep analysis)
```

**How `callAI()` works** (src/lib/agents.ts):
1. If tier is `"fast"` → route to Groq (`scoreBidsBatch()` or `callGroq()`)
2. If Groq unavailable → fall back to Azure OpenAI `gpt-4o-mini`
3. If tier is `"mini"` or `"standard"` → route to Azure OpenAI directly
4. All AI calls include timeout (2s for Groq, 30s for Azure)
5. Bidding agent always uses `"fast"` tier

---

## 6. Event System

**Kafka Topics** (packages/shared/src/events.ts):
```
campaign.created  campaign.updated  campaign.paused
bid.placed        bid.approved     bid.rejected
signal.captured   signal.enriched  signal.delivered
ltv.predicted     ltv.retrained
connector.synced  connector.error
system.alert      system.health
```

**Browser SSE**: `/api/events` → `useSSE()` hook → `EventBus` (packages/shared/src/index.ts)

---

## 7. Design Tokens

All colors defined in `src/lib/kdls.ts` as `K.*`:
```
K.mint     = "#10b981"   (success, ROAS, positive)
K.blue     = "#3b82f6"   (info, agents, links)
K.gold     = "#f59e0b"   (wallet, warnings)
K.teal     = "#14b8a6"   (signals)
K.danger   = "#ef4444"   (errors, stop-loss)
K.warn     = "#f59e0b"   (anomaly, caution)
K.t1       = "#f9fafb"   (primary text)
K.t2       = "#9ca3af"   (secondary text)
K.t3       = "#6b7280"   (tertiary text)
K.g950     = "#030712"   (bg darkest)
K.g900     = "#111827"   (bg dark)
K.g850     = "#1f2937"   (card bg)
K.cardBorder = "#1f2937" (borders)
K.cardHover = "#1a2332"  (hover state)
```

---

## 8. Critical Rules

### DO
- Every page must use `<DashboardLayout>` wrapper
- Every page must use `"use client"` directive
- Every page must check `useAuth()` — redirect to `/auth/login` if no token
- Every API route must validate JWT before responding
- Every API route must return `{ ok: true, ...data }` or `{ ok: false, error: "..." }`
- Use `K.*` design tokens — never hardcode colors
- Use `StatCard`, `Card`, `Badge`, `Button`, `ProgressBar` from `@/components/ui`
- Use `useSSE()` for real-time updates on dashboard pages
- Use `useKikiStore()` for global state (agents, wallet, UI)
- Use `useQuery()` from TanStack for data fetching with caching
- Run `npm run type-check` and `npm run lint` before committing
- All new API routes go under `src/app/api/[name]/route.ts`
- All new pages go under `src/app/dashboard/[slug]/page.tsx`
- Keep navigation in sync: update `NAV_GROUPS` in `DashboardLayout.tsx` when adding pages
- Keep API routes in sync: update `src/lib/api.ts` with typed fetch functions

### DON'T
- Never use `any` type
- Never hardcode colors — always use `K.*`
- Never create mock data or stubs — every page must call a real API
- Never skip auth checks on API routes
- Never commit `.env.local` or secrets
- Never use `window` or browser APIs in API routes
- Never create client components in `src/app/api/`
- Never import server-only modules in client components
- Never use `console.log` in production code (use error boundaries)
- Never leave dead links — if a nav item links to it, the page and API must exist
- Never use inline styles for complex animations — use `framer-motion`

---

## 9. Commands

```bash
npm run dev          # Start dev server (port 3000)
npm run build        # Production build
npm run lint         # ESLint check
npm run type-check   # TypeScript strict check
npm run test         # Vitest run (skips DB-dependent)
npm run test:watch   # Vitest watch mode
```

---

## 10. Adding a New Feature

1. **Page**: Create `src/app/dashboard/[feature]/page.tsx`
   - Use `"use client"` + `<DashboardLayout>`
   - Use `useAuth()` for token
   - Use `useQuery()` for data
   - Use `K.*` tokens for colors
   - Use `Card`, `StatCard`, `Badge`, `Button` from UI

2. **API Route**: Create `src/app/api/[feature]/route.ts`
   - Validate JWT from `Authorization` header
   - Return `{ ok: true, ...data }` or `{ ok: false, error }`
   - Use typed request/response

3. **Navigation**: Add to `NAV_GROUPS` in `DashboardLayout.tsx`
   - Pick correct group (OVERVIEW, INTELLIGENCE, FINANCE, OPERATIONS, CRM & CONTENT, SYSTEM)

4. **API Client**: Add typed function to `src/lib/api.ts`

5. **Types**: Add interfaces to `src/types/index.ts`

6. **Verify**: Run `npm run type-check && npm run lint && npm run test`

---

## 11. Environment Variables

```bash
# Database (PostgreSQL)
DATABASE_URL=postgresql://...

# Auth
JWT_SECRET=...
NEXTAUTH_SECRET=... (unused, kept for compatibility)

# Azure OpenAI
AZURE_OPENAI_ENDPOINT=https://kikiagentopenai-dc409.openai.azure.com/
AZURE_OPENAI_API_KEY=...
AZURE_OPENAI_DEPLOYMENT_MINI=gpt-4o-mini
AZURE_OPENAI_DEPLOYMENT_STANDARD=gpt-4o

# Groq (fast bidding)
GROQ_API_KEY=...
GROQ_MODEL=llama-3.1-8b-instant

# OpenCode (agent backend)
OPENCODE_ENDPOINT=http://localhost:8080
OPENCODE_SECRET=

# Kafka (optional, falls back to in-memory)
KAFKA_BROKERS=localhost:9092
KAFKA_CLIENT_ID=kiki-agent

# Stripe (billing)
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...

# Platform API Keys
META_ACCESS_TOKEN=...
GOOGLE_ADS_REFRESH_TOKEN=...
TIKTOK_ACCESS_TOKEN=...
SNAP_ACCESS_TOKEN=...
PINTEREST_ACCESS_TOKEN=...
LINKEDIN_ACCESS_TOKEN=...
```

---

## 12. Testing Strategy

- **Unit tests**: `test/pure.test.ts` — tests AI tier routing, score calculations, event schemas (no DB)
- **Integration tests**: Not yet implemented (requires PostgreSQL)
- **E2E tests**: Not yet implemented
- **Type checking**: `npm run type-check` — must pass with 0 errors
- **Linting**: `npm run lint` — must pass clean

---

## 13. Known Technical Debt

1. `package.json` engine constraint is `>=20.0.0 <23.0.0` but Node v24 is installed — use `--engine-strict=false` for npm installs
2. `proto/kiki.proto` defines gRPC services not yet implemented (design-only)
3. Some dashboard pages may use inline styles inconsistently — migrate to Tailwind where possible
4. No integration/E2E test coverage yet
5. OpenCode serve mode not yet tested end-to-end

---

## 14. File Naming Conventions

- Pages: `page.tsx` (Next.js App Router)
- API routes: `route.ts`
- Components: `PascalCase.tsx`
- Lib modules: `camelCase.ts`
- Types: `PascalCase` interfaces in `types/index.ts`
- Hooks: `useSomething.ts`
- Tests: `*.test.ts`
- Config: `.env.local` (never commit), `.env.template` (documented), `.env.example` (copy-paste)

---

## 15. Deployment

- **Azure**: `azd up` or `az acr build` → Container App
- **Docker**: Multi-stage build in `docker/Dockerfile`
- **Infra**: `infra/main.bicep` — provisions Container App, PostgreSQL, secrets
- **CI/CD**: GitHub Actions → Lint → Type-check → Test → Build → Deploy
- **Secrets**: All in Azure Key Vault, referenced via Container App env vars

---

## 16. Quick Reference — Finding Things

| What you need | Where to look |
|---|---|
| Dashboard page | `src/app/dashboard/[slug]/page.tsx` |
| API route | `src/app/api/[slug]/route.ts` |
| Navigation config | `src/components/layout/DashboardLayout.tsx` (NAV_GROUPS) |
| API client functions | `src/lib/api.ts` |
| Type definitions | `src/types/index.ts` |
| Design tokens | `src/lib/kdls.ts` |
| UI components | `src/components/ui/` |
| AI tier routing | `src/lib/agents.ts` (callAI) |
| Bidding logic | `src/lib/bidding.ts` |
| Event schemas | `packages/shared/src/events.ts` |
| Zustand store | `src/store/index.ts` |
| Auth hook | `src/hooks/useAuth.ts` |
| SSE hook | `src/hooks/useSSE.ts` |
| DB connection | `src/lib/db.ts` |
| Kafka config | `src/lib/kafka.ts` |
| Azure infra | `infra/main.bicep` |
| Env vars | `.env.local` (active), `.env.template` (docs) |

---

**Last updated**: 2026-07-16  
**Maintained by**: AI agents + human developers
