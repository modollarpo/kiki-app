# KIKI Agent™ — Enterprise Platform

**Autonomous LTV Campaign Execution Platform** · v2.4.0 · SOC2 Type II · GDPR Compliant

---

## Quick Start

```bash
# 1. Install
npm install

# 2. Configure environment
cp .env.example .env.local
# Edit .env.local with your API keys

# 3. Run development server
npm run dev          # → http://localhost:3000

# 4. Build for production
npm run build
npm run start
```

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    KIKI Agent™ Platform                      │
├──────────────────┬──────────────────┬───────────────────────┤
│  Web / PWA       │   Mobile Apps    │   Backend Services    │
│  Next.js 15      │   React Native   │   Node.js / Go        │
│  Azure SWA / AFD │   iOS + Android  │   AKS (Kubernetes)   │
│                  │   Expo EAS       │                       │
├──────────────────┴──────────────────┴───────────────────────┤
│                   Azure Infrastructure                       │
│   AKS · PostgreSQL · Redis · Key Vault · ACR · Front Door   │
└─────────────────────────────────────────────────────────────┘
```

---

## Pages (55 routes)

### Marketing
| Route | Description |
|---|---|
| `/` | Homepage — live terminal, features, social proof, pricing |
| `/features` | Interactive feature explorer (6 features) |
| `/pricing` | 3 plans with annual/monthly toggle |
| `/enterprise` | Enterprise capabilities + SLA |
| `/security` | SOC2, encryption, zero-trust |
| `/about` | Team and company story |
| `/contact` | Contact form |
| `/blog` | Blog with featured + grid posts |
| `/changelog` | Version history timeline |
| `/status` | Live service health dashboard (15 services) |
| `/app-download` | iOS, Android, PWA install |
| `/docs` | Developer documentation hub |

### Legal & Contracts
| Route | Description |
|---|---|
| `/privacy` | Privacy Policy (GDPR/CCPA) |
| `/terms` | Terms of Service v2.4 |
| `/digital-handshake` | Contract signing center (7 agreements) |
| `/oaas-agreement` | OaaS MSA with e-signature flow |
| `/nda` | Mutual NDA with e-signature |
| `/contracts` | All downloads + sub-processor list |

### Auth
| Route | Description |
|---|---|
| `/auth/login` | Login + forgot password + SSO |

### Dashboard (34 pages)
All under `/dashboard/*` — Command Center, Campaigns, Signals, Wallet, Agents, SyncBrain, Analytics, OaaS, Admin, Developer, CRM, B2B, MMM, Competitive, Scenarios, Fraud, Anomaly, Reports, Audit, Warehouse, Margin, Influencer, Settings, Billing, Finance, AI Ops, Agency, Partners, Consent, KYC, Notifications, Workflow, Creative Library, Savings

### Mobile + PWA
| Route | Description |
|---|---|
| `/mobile` | Full phone-frame mobile app (5 tabs + AI chat) |
| `/offline` | PWA offline fallback page |

---

## Environment Variables

```env
# App
NEXT_PUBLIC_APP_URL=https://kiki.ai
NEXT_PUBLIC_API_URL=https://api.kiki.ai
NEXT_PUBLIC_WS_URL=wss://ws.kiki.ai

# Database
PG_CONNECTION_STRING=postgresql://user:pass@host:5432/kiki_prod

# Cache
REDIS_URL=rediss://host:6380

# AI Models
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...

# Payments
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Monitoring
SENTRY_DSN=https://...@sentry.io/...
NEXT_PUBLIC_POSTHOG_KEY=phc_...

# Azure
AZURE_SUBSCRIPTION_ID=...
AZURE_TENANT_ID=...
AZURE_CLIENT_ID=...
AZURE_CLIENT_SECRET=...

# Mobile (EAS)
EXPO_TOKEN=...
APPLE_ID=...
APPLE_TEAM_ID=...
```

---

## Deployment

### Option A: One-command deploy (recommended)

```bash
chmod +x deploy/scripts/deploy.sh

# Deploy to staging
./deploy/scripts/deploy.sh staging

# Deploy to production (full stack)
./deploy/scripts/deploy.sh prod

# Deploy infra + prod
./deploy/scripts/deploy.sh prod --infra

# Web only (fast)
./deploy/scripts/deploy.sh prod --web-only

# Dry run (validate without deploying)
./deploy/scripts/deploy.sh prod --dry-run
```

### Option B: GitHub Actions (CI/CD)

Push to branch → automatic deploy:
- `develop` → dev environment
- `staging`  → staging environment  
- `main`     → production environment

See `.github/workflows/deploy.yml` for full pipeline.

### Option C: Manual Azure

```bash
# 1. Login
az login
az account set --subscription $AZURE_SUBSCRIPTION_ID

# 2. Create resource group
az group create --name kiki-agent-prod-rg --location westeurope

# 3. Deploy infrastructure
az deployment group create \
  --resource-group kiki-agent-prod-rg \
  --template-file deploy/azure/main.bicep \
  --parameters deploy/azure/parameters.prod.json

# 4. Build web app
npm run build

# 5. Deploy to Static Web Apps
npx @azure/static-web-apps-cli deploy .next \
  --deployment-token $SWA_TOKEN \
  --output-location .next

# 6. Deploy to AKS
az aks get-credentials --resource-group kiki-agent-prod-rg --name kiki-agent-prod-aks
IMAGE_TAG=$(git rev-parse --short HEAD)
find deploy/k8s -name "*.yaml" | xargs sed -i "s|IMAGE_TAG|$IMAGE_TAG|g"
kubectl apply -f deploy/k8s/ --namespace kiki-prod
kubectl rollout status deployment/api-gateway --namespace kiki-prod
```

---

## Mobile App Deployment

### Build & Submit

```bash
# Install EAS CLI
npm install -g eas-cli
eas login

# Build for staging (internal distribution)
cd mobile
eas build --platform all --profile staging

# Build for production (App Store + Play Store)
eas build --platform all --profile production

# Submit to stores
eas submit --platform ios --latest
eas submit --platform android --latest
```

### PWA

The PWA is automatically generated during `npm run build`. The service worker (`public/sw.js`) is generated by workbox using `workbox-config.js`.

```bash
# Generate service worker manually
npx workbox-cli generateSW workbox-config.js
```

Users can install the PWA from `app.kiki.ai` via "Add to Home Screen".

---

## Azure Infrastructure

Resources created by `deploy/azure/main.bicep`:

| Resource | Tier (prod) | Purpose |
|---|---|---|
| Azure Container Registry | Premium | Docker image storage |
| Azure Key Vault | Standard | Secrets management |
| PostgreSQL Flexible Server | D8s_v3, zone-redundant | Primary database |
| Azure Cache for Redis | Premium P1 | Session + signal cache |
| AKS Cluster | 3 node pools (system/app/gpu) | API + ML services |
| Azure Static Web Apps | Standard | Next.js web + PWA |
| Azure Front Door | Standard | CDN + WAF + global routing |
| Application Insights | — | APM + distributed tracing |
| Log Analytics Workspace | PerGB2018 | Centralized logging |

### Estimated costs (prod)
- AKS: ~$800–1,200/mo (autoscaled)
- PostgreSQL: ~$400/mo (D8s_v3, HA)
- Redis: ~$150/mo (P1)
- Static Web Apps: $9/mo
- Front Door: ~$50/mo
- **Total: ~$1,400–1,800/mo**

---

## KDLS Design System

All colors, fonts, and spacing defined in `src/lib/kdls.ts`:

```typescript
K.blue   = "#005CFF"   // Primary brand
K.mint   = "#31F3C3"   // Positive / active / LTV
K.gold   = "#F0A500"   // Finance / wallet
K.oaas   = "#7B2FFF"   // OaaS / AI decisions
K.teal   = "#00B8CC"   // Signals / data
K.green  = "#00CC66"   // SyncBrain / ML
K.danger = "#FF3B3B"   // Errors / fraud
K.warn   = "#F5A623"   // Warnings / paused
```

Typography:
- **JetBrains Mono** — all data values, metrics, code, labels
- **Inter** — body text, descriptions, prose

---

## Component Library (`src/components/ui/index.tsx`)

- `Button` — 8 variants × 5 sizes, loading state, beam animation
- `Badge` / `StatusBadge` — all states with pulse
- `Card` — accent bar, glow, hover
- `Input` — prefix/suffix/error/label/hint
- `Toggle` — animated switch
- `ProgressBar` — with glow
- `Sparkline` — SVG inline chart
- `StatCard` — KPI card with delta + sparkline
- `AIThinking` — animated SyncBrain indicator
- `EmptyState` — contextual empty states

---

## SEO

All 55 pages covered in `src/lib/seo.ts`:
- Unique `title`, `description`, `keywords[]` per page
- OpenGraph (title, description, url, image, locale, type)
- Twitter Card (summary_large_image)
- Canonical URLs
- `robots` directives (marketing: index,follow / dashboard: noindex)
- JSON-LD `SoftwareApplication` schema on root layout

---

## KIKI Agent™ © 2026 — All Rights Reserved

Built with the KIKI Design Language System (KDLS)
SOC2 Type II · GDPR · CCPA · PCI DSS
