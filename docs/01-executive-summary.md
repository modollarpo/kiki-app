# KIKI Agent™

## Autonomous LTV Campaign Execution Platform

**A STOREGRILL INC LTD Company** — Registered in England & Wales

---

**Founder:** Ariyo Dolapo  
**Date:** July 2026  
**Document:** Executive Summary — Confidential  

---

## The Problem

Digital advertising is broken by design.

Ad platforms optimise for *raw conversion events* — a £149 order sent as a £149 signal. The platform's algorithm sees a low-value customer and allocates budget accordingly. But that same customer may be worth £639 over 90 days. The platform never knows.

Every advertiser using Meta, Google, TikTok, or any major platform is leaving 3–4× of addressable lifetime value on the table because the signal they send is the transaction value, not the predicted customer value.

The result: **CPA optimisation becomes a race to the bottom.** Advertisers compete for the same high-intent buyers while undervaluing the customers who would generate the most long-term revenue.

## The Solution

KIKI Agent intercepts every conversion server-side, applies a proprietary ML model that predicts 90-day LTV in under 38ms, and enriches the signal before it reaches the ad platform. The platform sees the *predicted lifetime value* — not the raw order total — and optimises toward actual customer worth.

**Core capability:** A £149 order becomes a £639 signal. The bidding algorithm immediately recognises higher-value lookalike audiences, allocates more budget where LTV is highest, and deprioritises segments with low predicted retention.

## Technology

KIKI Agent is a production-deployed, multi-agent AI system:

| Component | Technology | Performance |
|---|---|---|
| LTV Prediction | Proprietary ensemble ML model | R²=0.91, 38ms median |
| AI Routing (SyncBrain) | 7-model gateway (GPT-4o, Claude, Gemini, LLaMA…) | 12ms routing latency |
| Fast Bidding | Groq Llama 3.1 8B | <200ms response |
| Heavy Processing | Azure OpenAI GPT-4o / GPT-4o-mini | 30s max, tiered |
| Event Bus | Apache Kafka (14 topics, 82 event types) | Real-time |
| Data Layer | PostgreSQL (Neon) + better-sqlite3 fallback | Multi-tenant |
| Infrastructure | Azure Container Apps, ACR, Bicep | 99.9% SLA-ready |
| Fraud Detection | IP + fingerprint + velocity scoring | 99.2% detection rate, 0.03% false positives |

**Six autonomous AI agents** operate continuously within configurable guardrails:

1. **Bidding Agent** — Cross-platform bid optimisation with LTV-aware day-parting
2. **Creative Agent** — Fatigue detection and AI-generated replacement creatives
3. **Smart Pacing Agent** — Budget allocation across campaigns and platforms
4. **Signals Agent** — CAPI enrichment, deduplication, and delivery
5. **SyncBrain Agent** — Multi-model routing with cost-quality optimisation
6. **OaaS Agent** — Automated operational task execution

## Business Model

KIKI Agent operates a dual-revenue SaaS model:

**1. Platform Subscription** (monthly recurring)
- **Growth:** £599/mo — 1 platform, 3 campaigns, 25K AI decisions
- **Scale:** £1,799/mo — 5 platforms, unlimited campaigns, 100K AI decisions
- **Enterprise:** From £4,999/mo — all platforms, custom limits, dedicated infra

**2. Usage-Based Fees** (metered)
- AI decisions overage: £0.008/decision
- Signal enrichment overage: £0.04/enriched conversion
- Creative generation: £15/creative bundle (AI-generated copy + image prompt)

**Target Gross Margin:** 82% (Year 1) → 88% (Year 5) — AI API costs scale sub-linearly

## Market Opportunity

| Metric | Value |
|---|---|
| Global digital ad spend (2026) | $745B |
| Ad tech / bid management TAM | $18.2B |
| Serviceable market (D2C £10M–£250M + Agencies) | $3.4B |
| Target customer count (Year 5) | 1,200+ |
| Implied market share (Year 5) | 0.08% |

**Key tailwinds:**
- Privacy regulation (GDPR, CCPA) is killing third-party signals — server-side CAPI is mandatory
- AI-native ad tech is the fastest-growing segment (CAGR 32%)
- Meta's CAPI mandate means every advertiser must run server-side events
- LTV modelling is the single highest-leverage optimisation available to performance advertisers

## Competitive Moat

1. **Prediction latency:** 38ms median LTV inference — fast enough to run inside the CAPI response window
2. **Multi-agent architecture:** Not a single model — six specialised agents that cross-optimise
3. **Platform breadth:** 14 connectors (Meta, Google, TikTok, LinkedIn, YouTube, Snap, Pinterest, Amazon DSP, Reddit, DV360, X, TradeDesk, Criteo, AppNexus)
4. **Fraud-before-enrichment:** IVT blocking occurs *before* LTV enrichment, preventing model poisoning
5. **Real-time arbitrage:** Cross-platform budget shifts triggered by competitor pricing signals
6. **Bundle of 42 dashboard surfaces:** Not an API — a full command centre with SyncBrain AI chat

## Traction & Milestones

| Milestone | Status |
|---|---|
| Product v2.0.0 | ✅ Live in production |
| 42 dashboard pages | ✅ Built and deployed |
| 75+ API routes | ✅ All live |
| 146 passing tests | ✅ CI/CD ready |
| 6 AI agents | ✅ Operational |
| 14 platform connectors | ✅ Built |
| Fraud detection engine | ✅ Live |
| Creative fatigue detection | ✅ Live |
| Google SSO & password reset | ✅ Live |
| SMTP email service | ✅ Ready (awaiting credentials) |

## Financial Highlights (5-Year Summary)

| Year | Customers (EOP) | ARR | Revenue | Gross Margin | EBITDA | Cumulative Cash |
|-----|-----------------|-----|---------|-------------|--------|-----------------|
| 1 | 18 | £198K | £124K | 82% | -£41K | -£41K |
| 2 | 65 | £786K | £492K | 85% | £102K | £61K |
| 3 | 220 | £2.64M | £1.72M | 87% | £612K | £673K |
| 4 | 540 | £6.48M | £4.56M | 88% | £1.89M | £2.56M |
| 5 | 1,200 | £14.4M | £10.4M | 88% | £4.62M | £7.18M |

Breakeven achieved in Month 15. Cash-flow positive from Month 18.

## The Ask

KIKI Agent is seeking:

**Pre-Seed (Current — Q3 2026):** £350K
- 12-month runway
- Engineering (1 senior full-stack), sales (1 UK BDM), compliance (legal)
- SEIS-eligible — 50% income tax relief for UK angel investors

**Seed (Q3 2027):** £1.5M
- 18-month runway
- Scale engineering team, expand sales to EU, launch self-serve onboarding
- Targeting £1M+ ARR at raise

## Team

**Ariyo Dolapo** — Founder & CEO  
10+ years in digital industry. Built KIKI Agent from concept to production single-handedly — 75+ API routes, 6 AI agents, 42 dashboard surfaces, production deployment on Azure. Deep expertise in ad-tech infrastructure, real-time bidding systems, and AI model routing.

**Seeking:** UK-based Co-Founder (Operations & Revenue) to lead commercial strategy, UK entity setup, GDPR compliance, investor relations, and customer acquisition. See Co-Founder Term Sheet for details.

---

*KIKI Agent™ is a trademark of STOREGRILL INC LTD. Confidential — not for distribution without authorisation.*
