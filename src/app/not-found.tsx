import Link from "next/link";
import { K } from "@/lib/kdls";

export default function NotFound() {
  return (
    <div style={{ minHeight:"100vh", background:K.void, display:"flex", alignItems:"center", justifyContent:"center", padding:"48px 24px", position:"relative", overflow:"hidden" }}>
      <div style={{ position:"absolute", inset:0, backgroundImage:`radial-gradient(circle,${K.g800} 1px,transparent 1px)`, backgroundSize:"32px 32px", opacity:0.3 }}/>
      <div style={{ position:"absolute", top:"40%", left:"50%", transform:"translateX(-50%)", width:600, height:400, background:`radial-gradient(circle,rgba(0,92,255,0.07) 0%,transparent 70%)`, filter:"blur(60px)", pointerEvents:"none" }}/>
      <div style={{ position:"relative", zIndex:1, textAlign:"center", maxWidth:520 }}>
        <div style={{ fontFamily:K.mono, fontWeight:700, fontSize:120, color:K.g700, letterSpacing:"-0.06em", lineHeight:1, marginBottom:8, userSelect:"none" }}>404</div>
        <h1 style={{ fontFamily:K.mono, fontWeight:700, fontSize:"clamp(20px,3vw,28px)", color:K.t1, letterSpacing:"-0.02em", marginBottom:12 }}>Page not found.</h1>
        <p style={{ fontFamily:"Inter,sans-serif", fontSize:15, color:K.t3, lineHeight:1.7, marginBottom:32 }}>The page you're looking for doesn't exist or you don't have permission to view it.</p>
        <div style={{ display:"flex", gap:12, justifyContent:"center", flexWrap:"wrap" }}>
          <Link href="/" style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"10px 22px", background:K.blue, color:"white", fontFamily:K.mono, fontSize:12, fontWeight:600, letterSpacing:"0.04em", borderRadius:2, textDecoration:"none", transition:"background 0.15s" }}>← Home</Link>
          <Link href="/dashboard" style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"10px 22px", background:K.g800, color:K.t2, fontFamily:K.mono, fontSize:12, fontWeight:600, letterSpacing:"0.04em", borderRadius:2, border:`1px solid ${K.g700}`, textDecoration:"none" }}>Dashboard →</Link>
        </div>
      </div>
    </div>
  );
}
