# KIKI Agent™ — Investor Data Room Checklist

## Product & Technical
- [x] Codebase inspected (Next.js 15, TypeScript, 102 API routes, 42 dashboard pages)
- [x] Build/test/type-check/lint run: 208 tests pass, type-check clean, lint clean
- [x] Repo audits: audit:stubs reports 0 un-allowed findings (102 pages+routes)
- [x] Critical security fixes verified: Slack fail-closed; SSE token support; tenant-scoped broadcasts
- [ ] Live connector integrations verified against real ad accounts (implemented; unverified)
- [x] Bidding execution implemented (DB update + platform push + audit + approval gating); units bug: bid passed as dailyBudget (updateCampaign) vs updateAdSet bidAmount

## Commercial
- [ ] Verified paying customers (none found in repo)
- [ ] Signed pilots/design partners with LOIs (none found)
- [ ] Measured ROAS/LTV lift vs holdout (none found)
- [x] Pricing implemented: Starter $690/mo, Growth $2000/mo, Enterprise custom
- [x] OaaS: 1.35% management fee + 5% ROAS uplift (billing.ts)
- [x] Company entity: STOREGRILL INC LTD (Company No. 14581073)

## Financial
- [ ] Verify financial model vs accounting (projections in docs)
- [ ] Confirm ask amount/instrument/valuation (Pre-Seed £350K, Seed £1.5M per docs — confirm)
- [ ] Track AI cost $/signal in production

## Compliance & Legal
- [ ] SOC 2 status confirmation
- [ ] DPA/sub-processor list review
- [ ] GDPR/CCPA controls review

## Evidence
- [x] Tests + audits included
- [x] Deck distinguishes implemented vs planned/unverified
