"use client";
import { useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui";
import { K } from "@/lib/kdls";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";

export default function LtvEnrichmentGuide() {
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

        <h1 className="font-mono font-bold text-lg text-t1 mb-2">What is LTV enrichment</h1>
        <p className="font-mono text-[11px] text-t3 mb-6 leading-relaxed">
          This is the core mechanism that makes KIKI different from every other advertising tool. Understanding this page means understanding why KIKI exists.
        </p>

        <Section title="The problem with raw conversion values">
          <Card padding={0}>
            <div className="px-5 py-4 border-b border-g800" style={{ background: K.dangerD }}>
              <div className="font-mono text-[11px] font-bold text-kdanger mb-[6px]">Without KIKI — what Meta sees</div>
              <div className="font-mono text-[22px] text-t1 mb-1">$149</div>
              <div className="font-mono text-[10px] text-t3 leading-relaxed">
                A customer buys a $149 product. Meta receives a conversion event worth $149. Its algorithm learns: &quot;Find more people who buy $149 products.&quot; But this customer would have spent $640 over 90 days — Meta doesn&apos;t know that. It optimises for cheap buyers, not valuable ones.
              </div>
            </div>
            <div className="px-5 py-4" style={{ background: `${K.mint}08` }}>
              <div className="font-mono text-[11px] font-bold text-kmint mb-[6px]">With KIKI — what Meta actually receives</div>
              <div className="font-mono text-[22px] text-t1 mb-1">$640</div>
              <div className="font-mono text-[10px] text-t3 leading-relaxed">
                The same $149 order. But KIKI&apos;s ML model predicts this customer will spend $640 over 90 days. KIKI sends $640 to Meta&apos;s CAPI. Its algorithm now learns: &quot;Find more people who look like $640 buyers.&quot; Over weeks, the algorithm shifts — it finds higher-value customers who happen to also buy your $149 product.
              </div>
            </div>
          </Card>
        </Section>

        <Section title="How the ML model works">
          <div className="font-mono text-[11px] text-t2 leading-loose">
            <p>KIKI&apos;s LTV model uses 28 features to predict 90-day customer value:</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
            <Card padding={0}>
              <div className="px-[14px] py-[10px]">
                <div className="font-mono text-[10px] font-bold text-kblue mb-[6px]">Purchase behaviour</div>
                <ul className="font-mono text-[10px] text-t3 leading-loose pl-[14px] m-0">
                  <li>Order value and AOV</li>
                  <li>Total orders (count)</li>
                  <li>Days since first order</li>
                  <li>Days since last order</li>
                  <li>Purchase frequency</li>
                  <li>Category purchased</li>
                </ul>
              </div>
            </Card>
            <Card padding={0}>
              <div className="px-[14px] py-[10px]">
                <div className="font-mono text-[10px] font-bold text-kmint mb-[6px]">Engagement signals</div>
                <ul className="font-mono text-[10px] text-t3 leading-loose pl-[14px] m-0">
                  <li>Session duration</li>
                  <li>Pages viewed</li>
                  <li>Cart additions</li>
                  <li>Email engagement</li>
                  <li>Referral source</li>
                  <li>Device type</li>
                </ul>
              </div>
            </Card>
            <Card padding={0}>
              <div className="px-[14px] py-[10px]">
                <div className="font-mono text-[10px] font-bold text-kgold mb-[6px]">Platform data</div>
                <ul className="font-mono text-[10px] text-t3 leading-loose pl-[14px] m-0">
                  <li>Platform (Meta/Google/TikTok)</li>
                  <li>Campaign attribution</li>
                  <li>Ad creative engaged</li>
                  <li>Click-through vs. view-through</li>
                  <li>Time from click to purchase</li>
                  <li>Placement (feed, stories, reels)</li>
                </ul>
              </div>
            </Card>
            <Card padding={0}>
              <div className="px-[14px] py-[10px]">
                <div className="font-mono text-[10px] font-bold text-koaas mb-[6px]">Historical context</div>
                <ul className="font-mono text-[10px] text-t3 leading-loose pl-[14px] m-0">
                  <li>Cohort size and retention curves</li>
                  <li>Category multipliers</li>
                  <li>Seasonal patterns</li>
                  <li>Regional LTV benchmarks</li>
                  <li>Previous LTV predictions (if any)</li>
                  <li>Model confidence interval</li>
                </ul>
              </div>
            </Card>
          </div>
        </Section>

        <Section title="The three LTV tiers">
          <div className="flex flex-col gap-2">
            {[
              { segment: "high", label: "High LTV", value: "$500+", multiplier: "1.5×", color: K.mint, borderClass: "border-l-kmint", textClass: "text-kmint", desc: "Customers predicted to spend $500+ in 90 days. These are your best buyers. KIKI sends a 1.5× bid multiplier to platforms — 'find more like this.'" },
              { segment: "mid", label: "Mid LTV", value: "$200-$500", multiplier: "1.2×", color: K.gold, borderClass: "border-l-kgold", textClass: "text-kgold", desc: "Solid customers with above-average value. KIKI sends a 1.2× multiplier — slightly higher bids to acquire more of these buyers." },
              { segment: "low", label: "Low LTV", value: "$80-$200", multiplier: "0.8×", color: K.t3, borderClass: "border-l-t3", textClass: "text-t3", desc: "Below-average value customers. KIKI sends a 0.8× multiplier — reduced bids. The platform still gets the signal, but KIKI deprioritises acquisition of these buyers." },
              { segment: "churn_risk", label: "Churn Risk", value: "<$80", multiplier: "0.4×", color: K.danger, borderClass: "border-l-kdanger", textClass: "text-kdanger", desc: "One-time buyers with no repeat purchase pattern. KIKI sends a 0.4× multiplier — significantly reduced bids. For refunds and cancellations, KIKI sends value: 0 — a negative signal that teaches the algorithm to stop finding these customers." },
            ].map((s) => (
              <Card key={s.segment} padding={0}>
                <div className={`px-4 py-3 flex items-start gap-3 border-l-[3px] ${s.borderClass}`}>
                  <div className="flex-1">
                    <div className="font-mono text-[11px] font-bold text-t1">{s.label} <span className="text-t4">({s.value})</span></div>
                    <div className="font-mono text-[10px] text-t3 leading-relaxed mt-1">{s.desc}</div>
                  </div>
                  <div className={`font-mono text-sm font-bold ${s.textClass} shrink-0`}>{s.multiplier}</div>
                </div>
              </Card>
            ))}
          </div>
        </Section>

        <Section title="The timeline — when does it start working?">
          <div className="font-mono text-[11px] text-t2 leading-loose">
            <p><strong className="text-t1">Day 1-3:</strong> KIKI collects baseline data. CAPI events are sent with heuristic fallback values (category multipliers). No ML model yet.</p>
            <p><strong className="text-t1">Day 7-14:</strong> Enough data to start segmenting customers into high/mid/low tiers. CAPI values become more precise.</p>
            <p><strong className="text-t1">Day 30-60:</strong> The ML model has enough training data to make meaningful predictions. CAPI enrichment shifts from heuristic to model-based.</p>
            <p><strong className="text-t1">Day 60-90:</strong> The compounding effect kicks in. Better signals → platform finds better customers → more high-LTV conversions → better model → even better signals.</p>
            <p><strong className="text-t1">Month 3+:</strong> Full ML model deployment. The bidding agent has 90 days of history. Platform algorithms have shifted significantly toward high-value buyers.</p>
          </div>
        </Section>

        <Section title="Before and after — realistic metrics">
          <Card padding={0}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              <div className="px-[14px] py-[10px] border-b border-g800 border-r border-r-g800 bg-g950">
                <div className="font-mono text-[10px] text-t4 mb-1">METRIC</div>
              </div>
              <div className="px-[14px] py-[10px] border-b border-g800 border-r border-r-g800 bg-g950">
                <div className="font-mono text-[10px] text-kdanger mb-1">WITHOUT KIKI</div>
              </div>
              <div className="px-[14px] py-[10px] border-b border-g800 bg-g950">
                <div className="font-mono text-[10px] text-kmint mb-1">WITH KIKI (90 DAYS)</div>
              </div>
              {[
                ["Platform ROAS", "2.1×", "3.4×"],
                ["Avg Customer LTV", "$180", "$340"],
                ["CAC", "$65", "$48"],
                ["LTV/CAC Ratio", "2.8×", "7.1×"],
                ["Impressions to 1 Conversion", "420", "280"],
                ["% High-LTV Customers", "12%", "28%"],
              ].map(([metric, before, after], i) => (
                <div key={i} className="contents">
                  <div className="px-[14px] py-2 border-b border-g900 border-r border-r-g800">
                    <span className="font-mono text-[10px] text-t2">{metric}</span>
                  </div>
                  <div className="px-[14px] py-2 border-b border-g900 border-r border-r-g800">
                    <span className="font-mono text-[10px] text-t3">{before}</span>
                  </div>
                  <div className="px-[14px] py-2 border-b border-g900">
                    <span className="font-mono text-[10px] text-kmint font-bold">{after}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </Section>

        <Section title="Important warning — platform ROAS may drop">
          <Card padding={0}>
            <div className="px-4 py-[14px] border-l-[3px] border-l-kgold" style={{ background: `${K.gold}10` }}>
              <div className="font-mono text-[11px] font-bold text-kgold mb-1">Expected behaviour, not a bug</div>
              <div className="font-mono text-[10px] text-t3 leading-relaxed">
                In the first 2-4 weeks, Meta&apos;s reported ROAS may <em>drop</em>. This is because KIKI is sending fewer but higher-value signals. Meta&apos;s attributed conversion count may decrease (KIKI is filtering out low-LTV buyers), but the average conversion value increases significantly. By week 6-8, the platform has adjusted and both attributed conversion count and ROAS recover — but now the customers are higher quality. The <em>true</em> incremental ROAS (measured by KIKI&apos;s holdout groups) improves from day 1.
              </div>
            </div>
          </Card>
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
