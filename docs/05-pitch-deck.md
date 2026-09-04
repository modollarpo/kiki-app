# KIKI Agent™ — Pitch Deck Narrative

**A STOREGRILL INC LTD Company** — Registered in England & Wales

---

**15 Slides** | **Presenter:** Ariyo Dolapo, Founder  
**Document:** Speaker notes and slide content

---

## Slide 1 — Title

**KIKI Agent™**  
Autonomous LTV Campaign Execution Platform

*Tagline:* Your £149 order becomes a £639 signal.

**KIKI Agent™ — A STOREGRILL INC LTD Company**  
*Registered in England & Wales*

---

## Slide 2 — The Problem: Ad Platforms Are Flying Blind

Every advertiser sends raw transaction values to ad platforms. The platform optimises toward a £149 order, never knowing that customer is worth £639 over 90 days.

**The result:**
- CPA optimisation becomes a race to the bottom
- Best customers are undervalued by 3–4×
- Lookalike audiences are built on the wrong signal
- 68% of D2C brands report declining ROAS (2025–2026)

*Ad platforms optimise toward what you send them. If you send raw orders, you get raw results.*

---

## Slide 3 — The Solution: LTV-Enriched Bidding

KIKI Agent intercepts every conversion server-side, predicts 90-day LTV in 38ms, and enriches the signal.

| Metric | Before KIKI | With KIKI |
|--------|------------|-----------|
| Signal sent to Meta | £149 (raw order) | £639 (predicted LTV) |
| Bid optimisation target | Low-value buyer | High-LTV customer |
| Lookalike audience seed | One-time purchaser | Repeat buyer profile |
| ROAS trajectory | Declining | Improving |

**It's not a bidder. It's an execution platform.**

---

## Slide 4 — How It Works

```
Checkout → KIKI Webhook → Fraud Scan (18ms)
                              ↓
                    LTV Prediction (38ms, R²=0.91)
                              ↓
                    Signal Enrichment (order → LTV)
                              ↓
                    CAPI Delivery → 14 Platforms
                              ↓
                Platforms Optimise Toward LTV
```

**Key differentiator:** Fraud detection runs *before* enrichment. Competitors enrich first and detect fraud later (or never) — their models learn to optimise toward bots.

---

## Slide 5 — Product: 42 Dashboard Surfaces

KIKI provides a full command centre, not an API:

| Group | Surfaces |
|-------|----------|
| **Overview** | Command Centre, Campaigns, Signals, Agents, Guides |
| **Intelligence** | SyncBrain AI Chat, Analytics, Intelligence, Competitive, MMM, B2B, Scenarios |
| **Finance** | Wallet, Billing, P&L, Margins, Influencers |
| **Operations** | OaaS, Workflow, Reports, Warehouse, Fraud, Anomaly, Commerce, Competitor |
| **CRM & Content** | CRM, Creative Library, Creative AI, Creative Attribution |
| **System** | AI Ops, Admin, Developer, Audit, Notifications, KYC, Consent, Settings |

Each surface is fully built, live, and responsive (320px–1920px).

---

## Slide 6 — Technology Architecture

| Layer | Technology | Performance |
|-------|-----------|-------------|
| LTV Prediction | Proprietary ensemble ML | 38ms, R²=0.91 |
| AI Routing | SyncBrain™ — 7 models | 12ms routing |
| Fast Bidding | Groq (Llama 3.1 8B) | <200ms |
| Heavy AI | Azure GPT-4o / GPT-4o-mini | Tiered (30s max) |
| Event Bus | Apache Kafka — 14 topics, 82 events | Real-time |
| Data | PostgreSQL / better-sqlite3 | Multi-tenant |
| Infrastructure | Azure Container Apps + Bicep | Auto-scaling |
| CI/CD | GitHub Actions + ACR Build | Fully automated |

**6 Autonomous AI Agents:** Bidding, Creative, Pacing, Signals, SyncBrain, OaaS

---

## Slide 7 — Traction

| Milestone | Status |
|-----------|--------|
| Product v2.0.0 | ✅ Live in production |
| 42 dashboard pages | ✅ Deployed |
| 75+ API routes | ✅ Live |
| 14 ad platform connectors | ✅ All integrated |
| 6 AI agents | ✅ Operational |
| Fraud detection engine | ✅ Live (99.2% detection, 0.03% false positive) |
| 146 passing tests | ✅ 0 TypeScript errors |
| CI/CD pipeline | ✅ Automated build → deploy |
| Google SSO, password reset, onboarding | ✅ Enterprise auth |
| Email service (SMTP) | ✅ Ready (awaiting credentials) |

**Built solo by Ariyo Dolapo — 10+ years digital industry.**

---

## Slide 8 — Market Opportunity

| Metric | Value |
|--------|-------|
| Global digital ad spend (2026) | $745B |
| AI-powered ad optimisation | $4.7B (CAGR 32.4%) |
| Server-side CAPI/enrichment | $1.1B (CAGR 41.2%) |
| KIKI's SAM | $3.4B |
| Target customers | 38,700 mid-market D2C + agencies |

**Key tailwinds:**
- Meta CAPI is mandatory — every advertiser needs server-side events
- Privacy regulation killed third-party signals — first-party LTV is the new frontier
- ROAS compression is driving demand for optimisation technology
- AI-native ad tech is the fastest-growing segment in marketing software

---

## Slide 9 — Competitive Landscape

| Company | LTV Enrichment | 6 AI Agents | 14 Platforms | Fraud-First | Starting Price |
|---------|---------------|------------|-------------|------------|----------------|
| **KIKI Agent** | ✅ 38ms | ✅ | ✅ | ✅ | **£599/mo** |
| Google Smart Bidding | ❌ | ❌ | ❌ Google only | ❌ | Free |
| Meta Advantage+ | ❌ | ❌ | ❌ Meta only | ❌ | Free |
| Adobe Experience Cloud | ❌ Batch | ❌ | Partial | ❌ | ~$5K/mo |
| Smartly.io | ❌ | Partial | 8 | ❌ | ~$2K/mo |
| Albert AI | ❌ | Partial | Partial | ❌ | ~$3K/mo |
| Madgicx | ❌ | Partial | 5 | ❌ | ~$400/mo |

**KIKI's moats:** 38ms latency (competitors: 12–48 hours), Fraud-before-enrichment (prevents model poisoning), 14 connectors, 6 cross-optimising agents, real-time budget arbitrage.

---

## Slide 10 — Business Model

**Dual-revenue SaaS:**

| Tier | Price | Target |
|------|-------|--------|
| **Growth** | £599/mo | Single-platform D2C |
| **Scale** | £1,799/mo | Multi-platform brands |
| **Enterprise** | From £4,999/mo | Large advertisers |

**Overage:** £0.008/AI decision, £0.04/enriched signal

| Metric | Year 1 | Year 3 | Year 5 |
|--------|--------|--------|--------|
| ARPU | £950/mo | £1,500/mo | £1,900/mo |
| Gross Margin | 64% | 85% | 90% |
| LTV:CAC | 7× | 17× | 25× |
| Net Revenue Retention | 105% | 118% | 125% |

---

## Slide 11 — Financial Projections

| Metric | Year 1 | Year 2 | Year 3 | Year 4 | Year 5 |
|--------|--------|--------|--------|--------|--------|
| Customers (EOP) | 15 | 50 | 150 | 400 | 800 |
| ARR (exit) | £205K | £780K | £2.7M | £8.2M | £18.2M |
| Revenue | £113K | £525K | £1.9M | £5.8M | £14.0M |
| Gross Margin | 64% | 80% | 85% | 88% | 90% |
| EBITDA | £24K | £250K | £969K | £3.9M | £10.8M |
| EBITDA Margin | 21% | 48% | 52% | 68% | 77% |
| Cumulative Cash | £21K | £263K | £1.2M | £5.1M | £15.9M |

**Breakeven:** Month 18 | **Cash-flow positive:** Month 15

---

## Slide 12 — Team

**Ariyo Dolapo — Founder, Product & Technology**  
*10+ years in digital industry*

Built KIKI Agent entirely solo:
- 75+ API routes, 6 AI agents, 14 connectors, 42 dashboard surfaces
- Production deployment on Azure with automated CI/CD
- 0 TypeScript errors, 146 passing tests

**Seeking:** UK-based Co-Founder (Operations & Revenue) — 20% equity, 4-year vesting.

*Ariyo handles product and technology. Co-Founder handles sales, fundraising, compliance, and UK operations.*

---

## Slide 13 — Fundraising

| Round | Amount | Timing | Investors | Use of Funds |
|-------|--------|--------|-----------|-------------|
| **Pre-Seed** | **£350K** | **Q3 2026** | **UK angels + SEIS** | **12mo runway, 1 engineer, sales, legal, infra** |
| Seed | £1.5M | Q3 2027 | UK seed funds | 18mo, scale team, EU expansion |
| Series A | £5M | Q3 2029 | Growth funds | US expansion |

**SEIS-eligible:** UK angels receive 50% income tax relief on investment.

**Pre-money valuation:** £1.8M–£2.2M  
**Dilution:** ~15%  
**Use of pre-seed:** Engineering (£80K), Sales (£55K), Legal/Compliance (£25K), Cloud Infrastructure (£60K), Founder living expenses (£60K), Reserve (£70K)

---

## Slide 14 — Co-Founder Opportunity

**The Role:** UK Co-Founder, Operations & Revenue

| Responsibility | Detail |
|---------------|--------|
| Sales | Lead UK D2C and agency pipeline |
| Fundraising | Manage investor relationships and due diligence |
| Compliance | UK GDPR, ICO, Companies House, VAT |
| Operations | Legal, accounting, customer success |
| Partnerships | Ad platform partner programmes |

**Compensation:**
- 20% equity (4-year vest, 1-year cliff)
- £0 salary until £300K ARR or Seed round
- Full-time from day one

*Ideal candidate: 5+ years ad tech/martech, UK-based, existing D2C network.*

---

## Slide 15 — Ask & Contact

**We are raising £350K pre-seed.**

| Contact | Detail |
|---------|--------|
| **Founder** | Ariyo Dolapo |
| **Company** | STOREGRILL INC LTD |
| **Product** | https://kiki-app.purplesky-3fddb402.swedencentral.azurecontainerapps.io |
| **Email** | [ariyo@kiki.ai] |

*"Your £149 order becomes a £639 signal."*

---

**KIKI Agent™ — A STOREGRILL INC LTD Company** | Registered in England & Wales | Confidential
