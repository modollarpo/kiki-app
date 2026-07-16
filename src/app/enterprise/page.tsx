"use client";
import { MarketingLayout } from "@/components/layout/MarketingLayout";
import { K } from "@/lib/kdls";
import { Badge, Button, Card } from "@/components/ui";
import { useRouter } from "next/navigation";

const CAPABILITIES = [
  {icon:"🔒",title:"Dedicated Infrastructure",desc:"Your own AKS cluster, PostgreSQL, and Redis. No shared compute. Infrastructure-level isolation.",color:K.blue},
  {icon:"🎨",title:"White-Label Portal",desc:"Full white-labeling: your logo, domain, colors. Clients see your brand, not ours.",color:K.oaas},
  {icon:"📋",title:"Custom SLA",desc:"Negotiated uptime guarantees, incident response SLAs, and dedicated on-call support.",color:K.gold},
  {icon:"🌍",title:"Data Residency",desc:"Choose where your data lives: EU (Frankfurt), US (Virginia), or APAC (Singapore).",color:K.teal},
  {icon:"👤",title:"Dedicated CSM",desc:"A dedicated Customer Success Manager who knows your business — not a ticket queue.",color:K.mint},
  {icon:"🔌",title:"Custom Integrations",desc:"KIKI engineering builds custom integrations for your data stack, CRM, and ad platforms.",color:K.crm},
];

export default function EnterprisePage() {
  const router = useRouter();
  return (
    <MarketingLayout>
      <div style={{ background:K.void }} className="p-20 px-12 max-w-[1100px] mx-auto">
        <div className="grid grid-cols-2 gap-12 mb-[72px] items-center">
          <div>
            <Badge color={K.gold} className="mb-4">ENTERPRISE</Badge>
            <h1 className="font-mono font-bold text-[clamp(28px,5vw,52px)] tracking-[-0.04em] text-t1 leading-[1.05] mb-5">Built for teams managing millions.</h1>
            <p className="font-sans text-[16px] text-t3 leading-[1.7] max-w-[480px] mb-8">Dedicated infrastructure, custom SLAs, white-label portals, and a team of humans behind the AI.</p>
            <div className="flex gap-3">
              <Button variant="gold" size="lg" onClick={() => router.push("/contact")}>Talk to Sales →</Button>
              <Button variant="secondary" size="lg" onClick={() => router.push("/contact")}>Request Demo</Button>
            </div>
          </div>
          <Card accent={K.gold} glow={K.gold}>
            <p className="font-mono font-bold text-[11px] text-kgold mb-4">ENTERPRISE SLA</p>
            {[["Platform Uptime","99.99%"],["Support Response","< 1 hour"],["CSM Response","< 15 min"],["Data Residency","EU · US · APAC"],["Dedicated AKS Cluster","Included"],["Contract Terms","Custom"]].map(([l,v])=>(
              <div key={l} className="flex justify-between py-[9px] border-b border-g800">
                <span className="font-mono text-[11px] text-t3">{l}</span>
                <span className="font-mono font-bold text-[11px] text-kgold">{v}</span>
              </div>
            ))}
          </Card>
        </div>
        <h2 className="font-mono font-bold text-[28px] tracking-tight text-t1 mb-8">Enterprise-only capabilities</h2>
        <div className="grid grid-cols-3 gap-4 mb-16">
          {CAPABILITIES.map(c=>(
            <div key={c.title} className="p-6 bg-g900 border border-g800 rounded-sm cursor-default transition-all"
              onMouseEnter={e=>{(e.currentTarget.style.background=K.g850);(e.currentTarget.style.transform="translateY(-2px)");}} onMouseLeave={e=>{(e.currentTarget.style.background=K.g900);(e.currentTarget.style.transform="none");}}>
              <div className="absolute top-0 left-0 right-0 h-px" style={{ background:`linear-gradient(90deg,transparent,${c.color}60,transparent)` }} />
              <span className="text-[28px] block mb-3">{c.icon}</span>
              <p className="font-mono font-bold text-[14px] text-t1 mb-2">{c.title}</p>
              <p className="font-sans text-[13px] text-t3 leading-[1.6]">{c.desc}</p>
            </div>
          ))}
        </div>
        <div className="text-center p-12 bg-g900 border border-g800 rounded-sm">
          <h2 className="font-mono font-bold text-[28px] tracking-tight text-t1 mb-3">Ready to scale?</h2>
          <p className="font-sans text-[15px] text-t3 mb-6">Talk to our enterprise team. Custom proposal within 48 hours.</p>
          <Button variant="gold" size="xl" onClick={() => router.push("/contact")}>Contact Enterprise Sales →</Button>
        </div>
      </div>
    </MarketingLayout>
  );
}
