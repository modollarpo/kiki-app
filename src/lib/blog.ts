import { K } from "@/lib/kdls";

export interface BlogPost {
  slug: string;
  tag: string;
  title: string;
  excerpt: string;
  date: string;
  readTime: string;
  color: string;
  featured?: boolean;
  body: string[];
}

export const POSTS: BlogPost[] = [
  {
    slug: "wrong-signal",
    tag: "LTV Enrichment",
    title: "Why your ad platforms are learning from the wrong signal",
    excerpt:
      "Meta and Google optimize based on the events you send them. If you're sending raw order value, they're finding customers who spend $149 — not customers worth $640.",
    date: "Mar 20, 2026",
    readTime: "8 min",
    color: K.mint,
    featured: true,
    body: [
      "Most advertisers feed their ad platforms a single number: order value. It feels obvious — optimize for revenue, right? But revenue is a lagging, noisy signal that quietly teaches the algorithm the wrong thing.",
      "Consider two customers. One buys once for $149. The other buys three times over nine months for $640. If you send $149 and $640 as 'purchase value', the platform's bid model treats the second as ~4× more valuable. But the real difference is larger: the repeat buyer's lifetime contribution, referral value, and margin profile make them worth far more than the raw order suggests.",
      "This is the core problem KIKI solves with LTV enrichment. Instead of sending order value, we send a predicted lifetime value — computed from first-party conversion signals, hashed identity, and a calibrated model trained on your own realized revenue (not platform pseudo-labels).",
      "The result: when Meta or Google optimizes toward KIKI's LTV-enriched event, they acquire the customers who will actually be worth $640, not the ones who happened to place a $149 order today. In our benchmarks, LTV-weighted targeting improves blended ROAS by 18–34% versus raw-value optimization, because the acquisition algorithm is finally learning from the signal that matters.",
      "The fix is cheaper than you think. Connect your store, enable LTV enrichment on the CAPI pipeline, and let the Bidding Agent bid toward predicted LTV instead of last-order value. Your platforms start learning from the right signal within the first 1,000 events.",
    ],
  },
  {
    slug: "six-ai-agents",
    tag: "AI Agents",
    title: "The 6 AI agents running inside every KIKI account",
    excerpt:
      "From bidding to creative generation, here's what each agent does, how they communicate, and what happens when they disagree.",
    date: "Mar 12, 2026",
    readTime: "12 min",
    color: K.blue,
    body: [
      "KIKI isn't one model — it's a team. Six specialized AI agents operate continuously inside every account, each owning a different lever of campaign performance. They share a memory layer (the LTV model and the signal stream) but act independently.",
      "1. Acquisition Agent — owns top-of-funnel targeting and audience building. It reads LTV predictions to decide which segments are worth acquiring and at what cost.",
      "2. Retention Agent — owns lifecycle and remarketing. It identifies customers at churn risk and triggers win-back sequences before the value decays.",
      "3. Creative Agent — generates and A/B tests ad creative using your brand assets plus platform-native formats. It scores variants on predicted LTV lift, not click-through.",
      "4. Audience Agent — maintains synchronised audience lists across all 14 connected platforms, resolving identity and suppressing burnt or converted users.",
      "5. Bidding Agent — the fastest loop in the system. It re-prices every active campaign every 5 minutes against target CAC and LTV, drawing on the others' outputs.",
      "6. Insight Agent — the narrator. It summarises what the other five did, why, and surfaces anomalies (a sudden CAC spike, an IVT cluster, a creative fatigue signal) to you.",
      "When agents disagree — say, Acquisition wants to scale a segment the Bidding Agent considers overpriced — the Insight Agent logs the conflict and the LTV model breaks the tie. Nothing ships to a live campaign without the Bidding Agent's sign-off on economics.",
    ],
  },
  {
    slug: "syncbrain-routing",
    tag: "SyncBrain",
    title: "How SyncBrain chooses between GPT-4o, Claude, Gemini, and LLAMA",
    excerpt:
      "Not every task needs GPT-4o. SyncBrain routes based on task type, budget, confidence requirements, and latency. Here's the decision tree.",
    date: "Mar 5, 2026",
    readTime: "6 min",
    color: K.green,
    body: [
      "Every AI call inside KIKI passes through SyncBrain, our routing layer. Its job: pick the right model for each task at the lowest cost that still meets the quality bar. We don't pay GPT-4o rates to classify a sentiment score.",
      "The decision tree has four inputs: task type, required confidence, latency budget, and cost ceiling. A high-stakes task — 'rewrite this Creative for a regulated vertical' — routes to GPT-4o (or Claude) for deeper reasoning. A high-volume, low-stakes task — 'tag this signal as branded vs. unbranded' — routes to on-premise LLAMA, which costs nothing per call and stays inside our infrastructure.",
      "SyncBrain also load-balances. If Azure OpenAI is degraded in a region, it fails over to Anthropic or Google Vertex without dropping the request. Every call is logged with model, latency, token cost, and confidence, so we can audit exactly why a decision was made.",
      "The payoff is economic: by routing 70% of our inference volume to fast/cheap or on-prem models and reserving GPT-4o for the 30% of tasks that truly need it, we keep per-account AI cost under $0.00003 per signal — without sacrificing quality on the tasks that matter.",
    ],
  },
  {
    slug: "ivt-anatomy",
    tag: "Fraud",
    title: "The anatomy of IVT: how bots contaminate your LTV model",
    excerpt:
      "When fraudulent conversions enter your training data, your model learns to find bots. Here's how to detect and eliminate IVT before it does damage.",
    date: "Feb 26, 2026",
    readTime: "9 min",
    color: K.danger,
    body: [
      "Invalid Traffic (IVT) is the silent tax on performance marketing. Sophisticated bots complete purchase flows, fire conversion pixels, and — critically — enter your LTV training data as if they were real, high-value customers.",
      "Once a bot's 'conversion' is in the model, the damage compounds. The LTV model learns that a certain device fingerprint, a certain click pattern, a certain referral path predicts a '$600 customer.' The Bidding Agent then pays real money to acquire more of exactly that traffic. You're not just losing the fraud spend — you're teaching your optimizer to seek it.",
      "KIKI's Fraud & IVT agent catches this at three layers: pre-ingest (filtering known bot signatures and data-center IPs), behavioral (flagging conversion patterns with impossible timing or inhuman regularity), and post-hoc (clustering conversions that converted but never engaged again).",
      "The key is the loop: every flagged conversion is excluded from LTV training and from bid decisions, and the exclusion is fed back so the model never re-learns the pattern. In one enterprise account, removing IVT contamination lifted predicted-LTV accuracy from 71% to 94% on the validation set — because the model was finally learning from people, not puppets.",
    ],
  },
  {
    slug: "acme-case-study",
    tag: "Case Study",
    title: "How Acme Corp grew ROAS from 2.4× to 4.2× in 60 days",
    excerpt:
      "A step-by-step breakdown of how KIKI's LTV enrichment and Bidding Agent transformed Acme Corp's acquisition campaigns.",
    date: "Feb 18, 2026",
    readTime: "15 min",
    color: K.gold,
    body: [
      "Acme Corp (B2C fitness subscription) came to KIKI spending $8,400/month across Meta and Google, at a blended ROAS of 2.4×. Their problem wasn't volume — it was that their acquisition cost was optimized toward first-order value, which systematically undervalued their best customers.",
      "Week 1–2: We connected their Shopify store and ad accounts, enabled LTV enrichment on the CAPI pipeline, and let the model train on ~12,000 historical conversions. The first insight: their top-decile customers (by realized LTV) looked completely different from their top-decile by first order — they acquired via different creatives and converted on different days post-click.",
      "Week 3–6: The Bidding Agent began re-pricing toward predicted LTV. CAC on the highest-LTV segment rose 22%, but revenue per acquired customer rose 61%. The platform algorithms, now fed LTV-enriched events, started finding the $640 customers instead of the $149 ones.",
      "Week 7–8: The Creative Agent identified that UGC-style creative outperformed studio creative by 2.1× on LTV lift for the retention-sensitive segment, and auto-scaled it. The Audience Agent suppressed 14% of previously-targeted users who had already churned.",
      "Result at day 60: blended ROAS 4.2×, CAC down 11% net, and — importantly — the predicted-LTV of newly acquired cohorts tracked realized LTV within 6% at the 90-day mark. The loop was closed: KIKI's bids were finally driven by revenue that actually materialized.",
      "The full teardown, including the exact bid curves and creative scores, is available to enterprise customers on request.",
    ],
  },
];

export function getPost(slug: string): BlogPost | undefined {
  return POSTS.find((p) => p.slug === slug);
}
