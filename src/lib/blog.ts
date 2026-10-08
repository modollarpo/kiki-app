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
      "The result: when Meta or Google optimizes toward KIKI's LTV-enriched event, they acquire the customers who will actually be worth $640, not the ones who happened to place a $149 order today. The acquisition algorithm is finally learning from the signal that matters.",
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
      "1. Bidding Agent — owns bid and budget decisions. It re-prices active campaigns against target CAC and LTV using predicted lifetime value, not last-order value.",
      "2. Creative Agent — scores and rotates ad variants. It ranks creative on predicted LTV lift rather than click-through rate.",
      "3. Smart Pacing Agent — manages budget delivery across the day so spend lands when your best converters are actually buying.",
      "4. Signals Agent — owns the CAPI pipeline. It intercepts conversions, enriches them with the 28-feature vector, and delivers them to every connected platform.",
      "5. OaaS Optimizer — runs performance-based optimization cycles, applying stop-loss rules and portfolio budget moves within your guardrails.",
      "6. SyncBrain Router — picks the model behind every AI call, balancing cost, latency, and confidence, and logs the reason for each choice.",
      "When agents disagree — say, pacing wants to scale a spend level the Bidding Agent considers overpriced — the decision is logged to the audit trail and evaluated against your guardrails. Nothing ships to a live campaign that violates a configured limit.",
    ],
  },
  {
    slug: "syncbrain-routing",
    tag: "SyncBrain",
    title: "How SyncBrain chooses between GPT-4o, GPT-4o-mini, and Llama 3.1",
    excerpt:
      "Not every task needs GPT-4o. SyncBrain routes based on task type, budget, confidence requirements, and latency. Here's the decision tree.",
    date: "Mar 5, 2026",
    readTime: "6 min",
    color: K.green,
    body: [
      "Every AI call inside KIKI passes through SyncBrain, our routing layer. Its job: pick the right model for each task at the lowest cost that still meets the quality bar. We don't pay GPT-4o rates to classify a sentiment score.",
      "The decision tree has four inputs: task type, required confidence, latency budget, and cost ceiling. A high-stakes task — 'rewrite this creative for a regulated vertical' — routes to GPT-4o for deeper reasoning. A high-volume, low-stakes task — 'tag this signal as branded vs. unbranded' — routes to GPT-4o-mini or Llama 3.1 on Groq, which costs a fraction per call and answers in well under a second.",
      "If Azure OpenAI is unavailable or over budget, the call falls back to Groq instead of failing — requests are never dropped. Every call is logged with model, latency, token cost, and confidence, so we can audit exactly why a decision was made.",
      "The payoff is economic: reserve GPT-4o for the tasks that truly need it and route the rest to the fast tier, keeping per-account AI cost low without sacrificing quality on the decisions that matter.",
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
      "The key is the loop: every flagged conversion is excluded from LTV training and from bid decisions, and the exclusion is fed back so the model never re-learns the pattern — because the model is finally learning from people, not puppets.",
    ],
  },
];

export function getPost(slug: string): BlogPost | undefined {
  return POSTS.find((p) => p.slug === slug);
}
