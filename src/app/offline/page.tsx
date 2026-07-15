"use client";
import { K } from "@/lib/kdls";

export default function OfflinePage() {
  return (
    <div style={{ minHeight:"100vh", background:K.void, display:"flex", alignItems:"center", justifyContent:"center", padding:"48px 24px", textAlign:"center" }}>
      <div>
        <div style={{ fontSize:56, marginBottom:20 }}>📡</div>
        <h1 style={{ fontFamily:K.mono, fontWeight:700, fontSize:28, color:K.t1, letterSpacing:"-0.02em", marginBottom:12 }}>No connection</h1>
        <p style={{ fontFamily:"Inter,sans-serif", fontSize:15, color:K.t3, lineHeight:1.7, maxWidth:360, margin:"0 auto 28px" }}>
          You're offline. KIKI Agent is available offline — some features require a connection to sync live data.
        </p>
        <button
          onClick={() => window.location.reload()}
          style={{ padding:"11px 24px", background:K.blue, color:"white", fontFamily:K.mono, fontSize:12, fontWeight:700, letterSpacing:"0.06em", borderRadius:2, border:"none", cursor:"pointer" }}>
          RETRY CONNECTION →
        </button>
        <div style={{ marginTop:32, padding:16, background:K.g900, border:`1px solid ${K.g800}`, borderRadius:2, display:"inline-block" }}>
          <p style={{ fontFamily:K.mono, fontSize:10, color:K.t3, marginBottom:8 }}>Available offline:</p>
          {["Dashboard overview","Cached campaigns","Recent signal data","Wallet balance"].map(f => (
            <div key={f} style={{ display:"flex", alignItems:"center", gap:8, marginBottom:5 }}>
              <span style={{ color:K.mint, fontSize:11 }}>✓</span>
              <span style={{ fontFamily:K.mono, fontSize:11, color:K.t2 }}>{f}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
