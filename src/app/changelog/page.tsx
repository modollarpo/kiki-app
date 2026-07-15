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
      <div style={{ background:K.void, padding:"80px 48px", maxWidth:720, margin:"0 auto" }}>
        <div style={{ marginBottom:48 }}>
          <p style={{ fontFamily:K.mono, fontSize:9, letterSpacing:"0.18em", color:K.t4, marginBottom:14 }}>CHANGELOG</p>
          <h1 style={{ fontFamily:K.mono, fontWeight:700, fontSize:"clamp(28px,5vw,44px)", letterSpacing:"-0.03em", color:K.t1 }}>What's new in KIKI Agent™</h1>
          <p style={{ fontFamily:"Inter,sans-serif", fontSize:15, color:K.t3, marginTop:10 }}>Platform updates, new features, and bug fixes.</p>
        </div>
        {RELEASES.map((r,i)=>(
          <div key={r.version} style={{ marginBottom:40, paddingLeft:20, borderLeft:`2px solid ${i===0?K.blue:K.g700}`, position:"relative" }}>
            <div style={{ position:"absolute", left:-6, top:4, width:10, height:10, borderRadius:"50%", background:i===0?K.blue:K.g700 }} />
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14 }}>
              <p style={{ fontFamily:K.mono, fontWeight:700, fontSize:18, color:K.t1 }}>{r.version}</p>
              <Badge color={TAG_COLORS[r.tag]||K.t3}>{r.tag.toUpperCase()}</Badge>
              <span style={{ fontFamily:K.mono, fontSize:11, color:K.t4 }}>{r.date}</span>
            </div>
            <div style={{ padding:"16px 20px", background:K.g900, border:`1px solid ${K.g800}`, borderRadius:2 }}>
              {r.highlights.map(h=>(
                <div key={h} style={{ display:"flex", gap:8, marginBottom:8, alignItems:"flex-start" }}>
                  <span style={{ color:i===0?K.mint:K.t3, fontFamily:K.mono, fontSize:12, flexShrink:0, marginTop:1 }}>{h.startsWith("Fixed")||h.startsWith("Improved")?"✦":"+"}</span>
                  <span style={{ fontFamily:"Inter,sans-serif", fontSize:13, color:i===0?K.t2:K.t3, lineHeight:1.4 }}>{h}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </MarketingLayout>
  );
}
