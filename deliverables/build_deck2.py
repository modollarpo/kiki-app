from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.util import Inches, Pt
from pptx.enum.text import PP_ALIGN
from datetime import datetime

BG = RGBColor(10,10,11)
T1 = RGBColor(240,240,250)
T2 = RGBColor(176,176,204)
BLUE = RGBColor(0,92,255)
MINT = RGBColor(49,243,195)
GOLD = RGBColor(240,165,0)

def title_slide(prs, txt):
    s = prs.slides.add_slide(prs.slide_layouts[6])
    bg = s.background
    f = bg.fill
    f.solid()
    f.fore_color.rgb = BG
    t = s.shapes.add_textbox(Inches(0.8), Inches(0.6), Inches(14.4), Inches(0.8))
    p = t.text_frame.paragraphs[0]
    p.text = txt
    p.font.name = 'Inter'
    p.font.size = Pt(28)
    p.font.bold = True
    p.font.color.rgb = T1
    return s

def bullet_slide(prs, title, bullets):
    s = title_slide(prs, title)
    b = s.shapes.add_textbox(Inches(0.8), Inches(1.8), Inches(14.4), Inches(6.0))
    tf = b.text_frame
    for i, l in enumerate(bullets):
        if i == 0:
            p = tf.paragraphs[0]
        else:
            p = tf.add_paragraph()
        p.text = l
        p.font.name = 'Inter'
        p.font.size = Pt(17)
        p.font.color.rgb = T2
        p.space_after = Pt(8)
    return s

prs = Presentation()
prs.slide_width = Inches(16)
prs.slide_height = Inches(9)

# 1
s = prs.slides.add_slide(prs.slide_layouts[6])
bg = s.background
f = bg.fill
f.solid()
f.fore_color.rgb = BG
sh = s.shapes.add_textbox(Inches(0.8), Inches(0.8), Inches(14.4), Inches(1.2))
p = sh.text_frame.paragraphs[0]
p.text = 'KIKI Agent™'
p.font.name = 'Inter'
p.font.size = Pt(48)
p.font.bold = True
p.font.color.rgb = T1
p.alignment = PP_ALIGN.CENTER
sh = s.shapes.add_textbox(Inches(0.8), Inches(2.2), Inches(14.4), Inches(1.0))
p = sh.text_frame.paragraphs[0]
p.text = 'Autonomous LTV Campaign Execution Platform'
p.font.name = 'Inter'
p.font.size = Pt(28)
p.font.color.rgb = T2
p.alignment = PP_ALIGN.CENTER
sh = s.shapes.add_textbox(Inches(0.8), Inches(3.8), Inches(14.4), Inches(1.0))
p = sh.text_frame.paragraphs[0]
p.text = 'Investor-Ready Pitch Deck'
p.font.name = 'Inter'
p.font.size = Pt(18)
p.font.color.rgb = BLUE
p.alignment = PP_ALIGN.CENTER
sh = s.shapes.add_textbox(Inches(0.8), Inches(7.0), Inches(14.4), Inches(0.8))
p = sh.text_frame.paragraphs[0]
p.text = f'STOREGRILL INC LTD (Company No. 14581073) | {datetime.now().strftime("%Y-%m-%d")}'
p.font.name = 'Inter'
p.font.size = Pt(12)
p.font.color.rgb = T2
p.alignment = PP_ALIGN.CENTER

# 2-14
bullet_slide(prs, 'The Problem', [
  'Ad platforms optimize to raw conversion value, not predicted lifetime value',
  'A $149 order can represent ~$639 in 90-day LTV — platforms don’t see it',
  'Fraud/IVT contaminates signals before optimization',
  'Multi-platform complexity exceeds manual optimization',
  'Privacy shifts drive need for first-party server-side enrichment',
])

bullet_slide(prs, 'Why Now', [
  'Privacy changes → CAPI adoption is mandatory',
  'Sub-100ms AI cost-effective at scale',
  'Brands $50K+/mo need measurable ROAS/LTV alignment',
  'Advantage+/PMax raise bar; cross-platform LTV control remains gap',
  'First-party signal quality is strategic advantage',
])

bullet_slide(prs, 'KIKI Solution (Code-Verified)', [
  'Next.js 15, JWT auth, 42 dashboard pages, 102 API routes — implemented',
  'Groq (fast) + Azure OpenAI (mini/standard) with fallback',
  '6 agents: bidding, creative, pacing, signals, syncbrain, oaas — DB-backed',
  'Bidding: execution path implemented with approval gating + audit logging',
  'Honest metrics: real DB data; fabricated deltas removed',
])

bullet_slide(prs, 'Technical Architecture', [
  'UI: Next.js 15, React 18, Tailwind, KDLS dark theme',
  'API: REST + SSE (tenant-scoped), JWT with ?token support for EventSource',
  'AI: Groq Llama 3.1, Azure GPT-4o-mini/4o',
  'Data: PostgreSQL (prod) + better-sqlite3 (local), tenant-isolated',
  'Infra: Azure Bicep, Container Apps, Kafka; connectors OAuth/CAPI',
])

bullet_slide(prs, 'Differentiation & Moat', [
  'LTV-enriched server-side signals change what algorithms learn',
  'Cost-aware multi-model routing (SyncBrain) balances latency/cost/quality',
  'Auditable agent actions + human approval for high-impact changes',
  'Fraud blocked before enrichment (prevents model poisoning)',
  'Revenue stacking: subscription + usage + OaaS + wallet/cards',
  'Execution implemented; live verification against accounts pending',
])

bullet_slide(prs, 'Market Opportunity (Bottom-Up)', [
  'Beachhead: eComm/lead-gen $50K–$2M/mo ad spend',
  'Pricing: Starter $690/mo, Growth $2000/mo, Enterprise custom (implemented)',
  'OaaS: 1.35% management fee + 5% ROAS uplift (implemented in billing)',
  'TAM/SAM/SOM require validation — not over-claimed',
  'Expansion: Enterprise, agencies, multi-brand',
])

bullet_slide(prs, 'Traction & Validation (Truthful)', [
  '208 tests pass (18 files), type-check/lint clean',
  '0 un-allowed stub findings (102 pages+routes scanned)',
  'No verified paying customers/pilots/measured lift',
  '3–5 design partners, 8–12 week pilots, holdout tests',
  'Success: ≥10% ROAS lift (stat sig), ≥80% pilot→paid (hypothesis)',
  'Security: critical findings verified remediated in current code',
])

bullet_slide(prs, 'Go-To-Market', [
  'Beachhead: Shopify/WooCommerce brands $50K+/mo',
  'Buyer: Head of Growth/CMO; Champion: Performance Marketing',
  'Motion: Free trial → Pilot → Paid (annual)',
  'Focus: measurable ROAS/LTV lift vs feature pitch',
  'First 10–20 trusted customers critical',
  'Founder-led + warm network + agency partnerships',
])

bullet_slide(prs, 'Competition & Positioning', [
  'Signal/attr: Northbeam, Triple Whale, Rockerbox',
  'Autonomous (integrated/free): Meta Advantage+, Google PMax',
  'Objection "Why not Advantage+?" every sales cycle',
  'Differentiator: cross-platform + LTV-optimized + auditable + multi-model',
  'Single-platform optimizes own inventory; KIKI optimizes cross-platform LTV',
  'Moat: trained LTV models + signal quality + auditability',
])

bullet_slide(prs, 'Financial Model (Illustrative)', [
  'Revenue: subscription + usage + OaaS; aligns with implementation',
  'AI cost managed via cost-aware routing; track $/enriched signal',
  'Infra baseline ~$1400–$1800/mo (README); scales with usage',
  'No verified historical revenue',
  '5-year projections from company docs — internal inconsistencies flagged',
  'Key: gross margin, CAC payback, inference cost, churn',
])

bullet_slide(prs, 'Roadmap & Top Priority', [
  '#1 Fix bidding: push bids via updateAdSet (bidAmount), not updateCampaign (dailyBudget)',
  '0–3m: fix correctness bug, connector tests, live verification',
  '3–6m: 3–5 pilots with holdouts, capture measured lift',
  '6–12m: pilot→paid, cost optimization, harden prod',
  '12–24m: agency, enterprise, SOC 2 progress',
  'Gate: pilot success criteria before scaling',
])

bullet_slide(prs, 'Risks, Mitigations & Evidence Gaps', [
  'Trust: approvals + audit trail + least privilege',
  'Bidding correctness: bid→dailyBudget bug — fix + verify live',
  'Connectors: implemented, unverified live — 1–2 first + integration tests',
  'Willingness-to-pay: unverified — paid pilots with success criteria',
  'AI cost: $/signal tracking + cost-aware routing',
  'Compliance: SOC 2 in progress; GDPR/CCPA documented',
])

bullet_slide(prs, 'Investment Proposition & Close', [
  'Exists: working codebase (208 tests, clean checks), real DB flows',
  'Prove: paid pilots with measured ROAS/LTV lift vs holdout',
  'Ask (docs): Pre-Seed £350K (Q3 2026), Seed £1.5M (Q3 2027) — SEIS-eligible',
  'Use: engineering (connectors+tests), pilots, GTM, infra',
  'Runway: 12–18 months; ops@kiki.ai',
  'Thesis: LTV-enriched server-side + cost-aware AI + auditable agents — credible if validated',
])

s = prs.slides.add_slide(prs.slide_layouts[6])
bg = s.background
f = bg.fill
f.solid()
f.fore_color.rgb = BG
t = s.shapes.add_textbox(Inches(0.8), Inches(3.5), Inches(14.4), Inches(1.0))
p = t.text_frame.paragraphs[0]
p.text = 'Thank You'
p.font.name = 'Inter'
p.font.size = Pt(42)
p.font.bold = True
p.font.color.rgb = T1
p.alignment = PP_ALIGN.CENTER
t2 = s.shapes.add_textbox(Inches(0.8), Inches(5.0), Inches(14.4), Inches(0.8))
p2 = t2.text_frame.paragraphs[0]
p2.text = 'KIKI Agent™ — Autonomous LTV Campaign Execution Platform'
p2.font.name = 'Inter'
p2.font.size = Pt(18)
p2.font.color.rgb = T2
p2.alignment = PP_ALIGN.CENTER

out = r'C:\kiki-app\deliverables\KIKI_Agent_Investor_Deck.pptx'
prs.save(out)
print('saved', out)
