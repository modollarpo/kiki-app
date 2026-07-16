"use client";
import { MarketingLayout } from "@/components/layout/MarketingLayout";
import { K } from "@/lib/kdls";
import { Badge } from "@/components/ui";

const RELEASES = [
  { version:"v2.4.0", date:"March 20, 2026", tag:"major",  highlights:["SyncBrain v3: 40% faster model routing","MMM integration with offline spend import","Virtual card velocity limits configurable","Bidding Agent supports TikTok Advantage+","UID2 integration for cookieless attribution"] },
  { version:"v2.3.2", date:"March 5, 2026",  tag:"patch",  highlights:["Fixed: Signal enrichment P99 latency 820ms→320ms","Fixed: Wallet balance in non-USD currencies","Fixed: Campaign wizard step 3 auth error"] },
  { version:"v2.3.0", date:"February 22, 2026", tag:"minor", highlights:["New: Anomaly detection with configurable thresholds","New: B2B attribution — account-based buying committee","Improved: SyncBrain token budget now per-tenant","Improved: Fraud false positive rate -60%"] },
  { version:"v2.2.0", date:"February 1, 2026", tag:"minor", highlights:["New: Workflow / Automation Builder (beta)","New: Competitive intelligence ad tracker","New: MMM analysis (alpha)","New: Agency white-label portal"] },
];

const TAG_COLORS: Record<string,string> = { major:K.mint, minor:K.blue, patch:K.t3 };

export default function ChangelogPage() {
  return (
    <MarketingLayout>
      <div className="bg-void py-20 px-12 max-w-[720px] mx-auto">
        <div className="mb-12">
          <p className="font-mono text-[9px] tracking-[0.18em] text-t4 mb-3.5">CHANGELOG</p>
          <h1 className="font-mono font-bold text-t1 tracking-[-0.03em]" style={{ fontSize:"clamp(28px,5vw,44px)" }}>What's new in KIKI Agent™</h1>
          <p className="font-sans text-[15px] text-t3 mt-2.5">Platform updates, new features, and bug fixes.</p>
        </div>
        {RELEASES.map((r,i)=>(
          <div key={r.version} className="mb-10 pl-5 relative" style={{ borderLeft:`2px solid ${i===0?K.blue:K.g700}` }}>
            <div className="absolute left-[-6px] top-1 w-2.5 h-2.5 rounded-full" style={{ background:i===0?K.blue:K.g700 }} />
            <div className="flex items-center gap-2.5 mb-3.5">
              <p className="font-mono font-bold text-[18px] text-t1">{r.version}</p>
              <Badge color={TAG_COLORS[r.tag]||K.t3}>{r.tag.toUpperCase()}</Badge>
              <span className="font-mono text-[11px] text-t4">{r.date}</span>
            </div>
            <div className="px-5 py-4 bg-g900 border border-g800 rounded-sm">
              {r.highlights.map(h=>(
                <div key={h} className="flex gap-2 mb-2 items-start">
                  <span className="font-mono text-xs shrink-0 mt-px" style={{ color:i===0?K.mint:K.t3 }}>{h.startsWith("Fixed")||h.startsWith("Improved")?"✦":"+"}</span>
                  <span className="font-sans text-[13px] leading-[1.4]" style={{ color:i===0?K.t2:K.t3 }}>{h}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </MarketingLayout>
  );
}
