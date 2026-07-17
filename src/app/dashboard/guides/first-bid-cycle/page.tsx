"use client";
import { useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui";
import { K } from "@/lib/kdls";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";

export default function FirstBidCycleGuide() {
  const { token } = useAuth();
  const router = useRouter();
  useEffect(() => { if (!token) router.push("/auth/login"); }, [token, router]);
  if (!token) return null;
  return (
    <DashboardLayout>
      <div className="p-[clamp(14px,3vw,28px)] max-w-[800px]">
        <Link href="/dashboard/guides" className="inline-block font-mono text-[10px] text-t3 no-underline mb-4">
          ← Back to Guides
        </Link>

        <h1 className="font-mono font-bold text-lg text-t1 mb-2">Understand your first bid cycle</h1>
        <p className="font-mono text-[11px] text-t3 mb-6 leading-relaxed">
          KIKI&apos;s bidding agent runs every 15 minutes, 24/7. Before your team has their morning coffee, it has already run 4 bid cycles. Here&apos;s exactly what it does.
        </p>

        <Section title="The 5 bid decisions">
          <div className="flex flex-col gap-2">
            {[
              { action: "Aggressive Increase", pct: "+25%", condition: "LTV/CAC > 8.0 and ROAS > 4.0", color: K.mint, borderClass: "border-l-kmint", textClass: "text-kmint", desc: "Your best campaigns — KIKI pushes budget hard. If a campaign is delivering 8× LTV on every CAC dollar, it deserves more spend." },
              { action: "Moderate Increase", pct: "+12%", condition: "LTV/CAC 4.0–8.0 and ROAS 2.5–4.0", color: K.blue, borderClass: "border-l-kblue", textClass: "text-kblue", desc: "Solid performers. KIKI grows spend steadily — enough to capture more volume, not enough to trigger Meta's learning phase reset." },
              { action: "Maintain", pct: "0%", condition: "LTV/CAC 2.5–4.0 and ROAS 1.5–2.5", color: K.t3, borderClass: "border-l-t3", textClass: "text-t3", desc: "On target. No changes. The agent monitors but doesn't touch anything. Sometimes the best action is no action." },
              { action: "Moderate Decrease", pct: "-8%", condition: "LTV/CAC 1.5–2.5 and ROAS 1.0–1.5", color: K.gold, borderClass: "border-l-kgold", textClass: "text-kgold", desc: "Underperforming. KIKI reduces bids gradually — never enough to trigger a learning phase reset, but enough to slow the bleed." },
              { action: "Stop-Loss Pause", pct: "PAUSE", condition: "CAC > 2.5× target CAC", color: K.danger, borderClass: "border-l-kdanger", textClass: "text-kdanger", desc: "Emergency stop. The campaign is burning cash with no path to profitability. KIKI pauses it immediately and sends you an alert. You resume manually after reviewing." },
            ].map((d) => (
              <Card key={d.action} padding={0}>
                <div className={`px-4 py-3 flex items-start gap-3 border-l-[3px] ${d.borderClass}`}>
                  <div className={`font-mono text-base font-bold ${d.textClass} w-[60px] shrink-0 text-center`}>
                    {d.pct}
                  </div>
                  <div className="flex-1">
                    <div className="font-mono text-[11px] font-bold text-t1">{d.action}</div>
                    <div className="font-mono text-[10px] text-t4 mt-[1px]">When: {d.condition}</div>
                    <div className="font-mono text-[10px] text-t3 leading-relaxed mt-1">{d.desc}</div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </Section>

        <Section title="Why the agent needs 5 conversions first">
          <div className="font-mono text-[11px] text-t2 leading-loose">
            <p>The bidding agent won&apos;t touch a campaign until it has at least <strong className="text-t1">5 conversions</strong> in the last 7 days. This isn&apos;t arbitrary — it&apos;s statistical necessity.</p>
            <p>With fewer than 5 conversions, the CAC calculation is too noisy to act on. A single high-value or low-value purchase can swing the number by 40%. Acting on noisy data is worse than not acting at all.</p>
            <p>Once the agent has 5+ conversions, the CAC stabilises to within ±10% of its true value, and the agent can make confident decisions.</p>
            <p className="text-kgold"><strong>What to do while waiting:</strong> Watch the Signal Stream. Each conversion that arrives is being enriched with LTV predictions. Even before the bidding agent acts, the CAPI enrichment is already sending better signals to your platforms.</p>
          </div>
        </Section>

        <Section title="Reading the Intelligence panel">
          <Card padding={0}>
            <div className="grid grid-cols-[120px_1fr]">
              {[
                ["Campaign", "The campaign name and platform (Meta/Google/TikTok)"],
                ["Status", "active, paused, or stop_loss. Stop-loss means the agent paused it automatically."],
                ["Target CAC", "The CAC you set when creating the campaign. The agent optimises toward this."],
                ["Actual CAC", "Real-time CAC based on last 7 days. This is what the agent evaluates against."],
                ["LTV/CAC", "The core ratio. Higher is better. Above 4.0 = healthy. Above 8.0 = the agent will push aggressively."],
                ["ROAS", "Platform-reported return on ad spend. Take with a grain of salt — see the LTV enrichment guide for why."],
                ["Bid Decision", "What the agent did in the last cycle: increase, decrease, maintain, or pause."],
                ["Confidence", "How confident the agent is in its decision. Above 0.8 = high confidence. Below 0.5 = it's still learning."],
                ["Last Cycle", "When the agent last evaluated this campaign. Runs every 15 minutes."],
                ["7-Day Spend", "Total ad spend in the last 7 days. The agent compares this against conversions."],
              ].map(([field, desc], i) => (
                <div key={i} className="contents">
                  <div className={`px-[14px] py-2 border-b border-g900 border-r border-r-g800 ${i % 2 === 0 ? "bg-g950" : ""}`}>
                    <span className="font-mono text-[10px] font-bold text-t1">{field}</span>
                  </div>
                  <div className={`px-[14px] py-2 border-b border-g900 ${i % 2 === 0 ? "bg-g950" : ""}`}>
                    <span className="font-mono text-[10px] text-t3">{desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </Section>

        <Section title="How to set a good target CAC">
          <div className="font-mono text-[11px] text-t2 leading-loose">
            <p>Your target CAC determines how aggressively the bidding agent optimises. Here&apos;s a formula:</p>
            <Card padding={0}>
              <div className="px-4 py-[14px] bg-g950">
                <div className="font-mono text-xs text-t1 text-center mb-2">
                  Target CAC = Customer LTV ÷ Desired ROI Multiplier
                </div>
                <div className="font-mono text-[10px] text-t3 text-center">
                  Example: If your average customer spends $400 over 90 days and you want 5× return:<br />
                  <span className="text-kmint">$400 ÷ 5 = $80 target CAC</span>
                </div>
              </div>
            </Card>
            <div className="mt-3">
              <p><strong className="text-t1">Too low (e.g., $10):</strong> The agent will pause almost everything. Nothing can acquire customers that cheaply.</p>
              <p><strong className="text-t1">Too high (e.g., $200):</strong> The agent will never trigger stop-loss, even on badly performing campaigns. You&apos;ll overspend.</p>
              <p><strong className="text-t1">Just right:</strong> Start with your current actual CAC, then reduce it by 5-10% per week as the LTV enrichment starts working. The agent will gradually find cheaper acquisition paths.</p>
            </div>
          </div>
        </Section>

        <Section title="What happens during a cycle (technical)">
          <div className="font-mono text-[10px] text-t3 leading-loose">
            <p><strong className="text-t1">Every 15 minutes:</strong></p>
            <ol className="pl-[18px] my-2">
              <li>Pull 7-day metrics for all active campaigns across all tenants</li>
              <li>For each campaign: compute actualCAC / targetCAC and avgLTV / actualCAC</li>
              <li>Classify into one of 5 action buckets</li>
              <li>Apply guardrails: max 40% bid increase per cycle, max 30% budget shift per cycle (to avoid triggering Meta&apos;s learning phase reset)</li>
              <li>Call platform API (Meta/Google/TikTok) to apply the change</li>
              <li>Log the decision with full reasoning to the audit trail</li>
              <li>Stream the decision to the Intelligence panel via SSE</li>
            </ol>
            <p className="mt-2 text-kgold"><strong>Guardrails explained:</strong> Meta resets its learning phase when you change budget by &gt;20% or modify targeting. KIKI splits large changes across multiple cycles to stay below these thresholds. A 40% budget increase happens as +12% per cycle over 4 cycles — Meta never notices.</p>
          </div>
        </Section>
      </div>
    </DashboardLayout>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-7">
      <h2 className="font-mono text-[13px] font-bold text-t1 mb-3 pb-2 border-b border-g800">
        {title}
      </h2>
      {children}
    </div>
  );
}
