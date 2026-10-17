# KIKI Agent™ — Deck QA Report

## Build & Export
- [x] PPTX generated: KIKI_Agent_Investor_Deck.pptx (14 content slides + cover + thank you)
- [x] PDF exported via PowerPoint COM (ppSaveAsPDF/32)

## Slide-by-slide
- Cover: brand, entity, date — OK
- Problem/Why now: accurate
- Solution: code-verified claims only; separates implemented from unverified
- Product Experience: screenshots included
- Technical Architecture: reflects actual stack (Next.js 15, JWT, SSE, AI routing, DB, connectors)
- Differentiation: includes moat (LTV enrichment), revenue stacking
- Market: bottom-up, transparent about SAM/SOM/TAM
- Traction: truthful (no fabricated customers); tests 208 passing, audits 0 un-allowed
- Competition: includes Northbeam/Triple Whale/Rockerbox + Advantage+/PMax + objection
- Financials: illustrative; flags internal inconsistencies
- Roadmap: #1 fix — bid pushed to updateAdSet (bidAmount) not updateCampaign (dailyBudget)
- Risks: includes trust + correctness bug + live connector verification
- Investment: flags ask confirmation; SEIS-eligible noted
- Close/Thank you: OK

## Checks
- [x] Fonts resolve (Inter)
- [x] Dark theme consistent (#0A0A0B)
- [x] Source references accurate (pricing, billing, bidding code paths)
- [x] Claims register items: critical findings tracked

## Known Limitations
- Live ad account execution unverified
- Bidding pushes bid as dailyBudget (semantic/correctness bug) — documented
- Financial projections illustrative; internal inconsistencies exist in docs
- Willingness-to-pay unverified (requires paid pilots)

## Final
- Files: .pptx, .pdf, data room checklist, QA report, source build_deck2.py
