import Link from "next/link";
import { K } from "@/lib/kdls";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-void flex items-center justify-center py-12 px-6 relative overflow-hidden">
      <div className="absolute inset-0 opacity-30" style={{ backgroundImage: `radial-gradient(circle,${K.g800} 1px,transparent 1px)`, backgroundSize: "32px 32px" }}/>
      <div className="absolute" style={{ top: "40%", left: "50%", transform: "translateX(-50%)", width: 600, height: 400, background: `radial-gradient(circle,rgba(0,92,255,0.07) 0%,transparent 70%)`, filter: "blur(60px)", pointerEvents: "none" }}/>
      <div className="relative z-10 text-center max-w-[520px]">
        <div className="font-mono font-bold text-[120px] text-g700 tracking-[-0.06em] leading-none mb-2 select-none">404</div>
        <h1 className="font-mono font-bold text-[clamp(20px,3vw,28px)] text-t1 tracking-[-0.02em] mb-3">Page not found.</h1>
        <p className="font-sans text-[15px] text-t3 leading-[1.7] mb-8">The page you&apos;re looking for doesn&apos;t exist or you don&apos;t have permission to view it.</p>
        <div className="flex gap-3 justify-center flex-wrap">
          <Link href="/" className="inline-flex items-center gap-1.5 px-[22px] py-[10px] bg-kblue text-white font-mono text-[12px] font-semibold tracking-[0.04em] rounded-kdls no-underline transition-colors">← Home</Link>
          <Link href="/dashboard" className="inline-flex items-center gap-1.5 px-[22px] py-[10px] bg-g800 text-t2 font-mono text-[12px] font-semibold tracking-[0.04em] rounded-kdls no-underline" style={{ border: `1px solid ${K.g700}` }}>Dashboard →</Link>
        </div>
      </div>
    </div>
  );
}
