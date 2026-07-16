"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useKikiStore } from "@/store";
import { K } from "@/lib/kdls";
import { Badge, ProgressBar, StatusBadge } from "@/components/ui";
import Image from "next/image";

// ─── Mobile UI Primitives ─────────────────────────────────
const MBtn = ({ children, variant="primary", onClick, full, style }: {
  children: React.ReactNode; variant?: "primary"|"secondary"|"ghost"|"mint"|"danger";
  onClick?: () => void; full?: boolean; style?: React.CSSProperties;
}) => {
  const [p, setP] = useState(false);
  const bg: Record<string,string> = { primary:K.blue, secondary:K.g800, ghost:"transparent", mint:K.mint, danger:K.danger };
  const co: Record<string,string> = { primary:"white", secondary:K.t2, ghost:K.t3, mint:K.void, danger:"white" };
  return (
    <button onClick={onClick} onMouseDown={()=>setP(true)} onMouseUp={()=>setP(false)}
      className="inline-flex items-center justify-center gap-1.5 px-4 py-[11px] rounded-[10px] font-mono text-[13px] font-semibold cursor-pointer"
      style={{ background:bg[variant], color:co[variant], border:`1px solid ${variant==="secondary"?K.g700:"transparent"}`, width:full?"100%":undefined, opacity:p?0.8:1, transition:"opacity 0.1s", ...style }}>
      {children}
    </button>
  );
};

const MCard = ({ children, accent, style }: { children: React.ReactNode; accent?: string; style?: React.CSSProperties }) => (
  <div className="bg-g900 rounded-xl p-4 relative overflow-hidden" style={{ border:`1px solid ${K.g800}`, ...style }}>
    {accent && <div className="absolute top-0 left-0 right-0 h-px" style={{ background:`linear-gradient(90deg,transparent,${accent}80,transparent)` }} />}
    {children}
  </div>
);

const MStat = ({ label, value, color=K.t1 }: { label: string; value: string; color?: string }) => (
  <div className="px-3.5 py-3 bg-g850 rounded-[10px] text-center">
    <p className="font-mono font-bold text-[16px]" style={{ color }}>{value}</p>
    <p className="font-mono text-[9px] tracking-[0.12em] text-t4 mt-[3px]">{label}</p>
  </div>
);

// ─── Mobile Screen Components ─────────────────────────────
function HomeScreen({ onNav }: { onNav: (s: string) => void }) {
  const { agents, walletBalance } = useKikiStore();
  const running = agents.filter(a => a.status === "running").length;

  const CAMPAIGNS = [
    { name:"Q4 Fitness Acq.", roas:4.23, status:"active" },
    { name:"Retargeting",     roas:6.87, status:"active" },
    { name:"Brand YouTube",   roas:2.10, status:"paused" },
  ];

  return (
    <div className="flex-1 overflow-y-auto px-4 pb-4">
      {/* Hero */}
      <div className="rounded-2xl p-[18px] mb-3.5" style={{ background:`linear-gradient(135deg,${K.g850},${K.g800})`, border:`1px solid ${K.g700}` }}>
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="font-mono text-[9px] tracking-[0.14em] text-t4 mb-1">LTV ENRICHMENT</p>
            <p className="font-mono font-bold text-[28px] text-kmint">4.3×</p>
            <p className="font-mono text-[9px] text-t3">LTV ENRICHMENT RATIO</p>
          </div>
          <div className="text-right">
            <Badge color={K.mint} dot pulse className="mb-2 block">{running} AGENTS</Badge>
            <p className="font-mono text-[9px] text-t3">All nominal</p>
          </div>
        </div>
        <div className="flex gap-2.5">
          {[{l:"CAC",v:"$21.40",c:K.blue},{l:"LTV",v:"$312",c:K.oaas},{l:"QUALITY",v:"94.2%",c:K.teal}].map(k=>(
            <div key={k.l} className="flex-1 py-2 px-[10px] rounded-lg text-center" style={{ background:"rgba(0,0,0,0.3)" }}>
              <p className="font-mono font-bold text-[12px]" style={{ color:k.c }}>{k.v}</p>
              <p className="font-mono text-[8px] text-t4 mt-0.5">{k.l}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Wallet */}
      <MCard accent={K.gold} style={{ marginBottom:14 }}>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-mono text-[9px] tracking-[0.14em] text-t4 mb-1">WALLET</p>
            <p className="font-mono font-bold text-[24px] text-kgold">${(walletBalance/1000).toFixed(1)}K</p>
            <p className="font-mono text-[9px] text-t3">~22 days runway</p>
          </div>
          <MBtn variant="mint" onClick={() => onNav("wallet")} style={{ borderRadius:20, padding:"8px 16px", fontSize:11 }}>↑ Top Up</MBtn>
        </div>
      </MCard>

      {/* Campaigns */}
      <p className="font-mono font-bold text-[10px] text-t3 mb-2.5 flex items-center gap-1.5">CAMPAIGNS <span className="font-mono text-[8px] text-t4 rounded-[3px] px-1 py-[1px]" style={{ border:`1px solid ${K.g700}` }}>SAMPLE</span></p>
      {CAMPAIGNS.map(c => (
        <div key={c.name} className="bg-g900 rounded-xl p-3.5 mb-2" style={{ border:`1px solid ${K.g800}` }}>
          <div className="flex items-center justify-between mb-1.5">
            <p className="font-mono font-bold text-[12px] text-t1">{c.name}</p>
            <p className="font-mono font-bold text-[14px]" style={{ color:c.roas>=4?K.mint:K.warn }}>{c.roas}×</p>
          </div>
          <StatusBadge status={c.status} />
        </div>
      ))}

      {/* AI CTA */}
      <div onClick={() => onNav("chat")} className="p-3.5 rounded-xl cursor-pointer flex items-center gap-3 mt-1" style={{ background:K.greenT, border:`1px solid ${K.green}30` }}>
        <span className="text-xl">⬡</span>
        <div>
          <p className="font-mono font-bold text-[12px]" style={{ color:K.green }}>Ask SyncBrain</p>
          <p className="font-sans text-[11px] text-t3">Get instant AI insights</p>
        </div>
        <span className="ml-auto font-mono text-[14px] text-t4">›</span>
      </div>
    </div>
  );
}

function AgentsScreen() {
  const { agents, toggleAgent } = useKikiStore();
  return (
    <div className="flex-1 overflow-y-auto px-4 pb-4">
      <div className="flex items-center justify-between mb-3.5">
        <p className="font-mono font-bold text-[16px] text-t1">AI Agents</p>
        <Badge color={K.mint} dot pulse>{agents.filter(a=>a.status==="running").length} RUNNING</Badge>
      </div>
      {agents.map(a => (
        <MCard key={a.id} accent={a.status==="running"?a.color:undefined} style={{ marginBottom:10 }}>
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1">
              <p className="font-mono font-bold text-[13px] text-t1 mb-[3px]">{a.name}</p>
              <StatusBadge status={a.status} />
            </div>
            <p className="font-mono font-bold text-[13px]" style={{ color:a.color }}>{a.metric}</p>
          </div>
          <p className="font-mono text-[10px] text-t3 italic mb-2.5 overflow-hidden text-ellipsis whitespace-nowrap">{a.task}</p>
          <div className="flex gap-2">
            <MBtn variant={a.status==="running"?"secondary":"primary"} onClick={() => toggleAgent(a.id)} style={{ flex:1, borderRadius:8, padding:"8px", fontSize:11 }}>{a.status==="running"?"⏸ Pause":"▸ Resume"}</MBtn>
            <MBtn variant="ghost" style={{ borderRadius:8, padding:"8px 12px", fontSize:11 }}>Logs →</MBtn>
          </div>
        </MCard>
      ))}
    </div>
  );
}

function WalletScreen() {
  const { walletBalance, topUpWallet, addToast } = useKikiStore();
  const [amt, setAmt] = useState(1000);
  const CARDS = [
    { name:"Q4 Meta",    last4:"4892", limit:15000, spent:8400, color:K.blue   },
    { name:"Google Ads", last4:"2341", limit:10000, spent:4200, color:K.teal   },
    { name:"TikTok",     last4:"5561", limit:5000,  spent:0,    color:K.oaas, frozen:true },
  ];
  return (
    <div className="flex-1 overflow-y-auto px-4 pb-4">
      <MCard accent={K.gold} style={{ marginBottom:14, textAlign:"center" }}>
        <p className="font-mono text-[9px] tracking-[0.14em] text-t4 mb-1.5">AVAILABLE BALANCE</p>
        <p className="font-mono font-bold text-[36px] text-kgold">${(walletBalance/1000).toFixed(1)}K</p>
        <p className="font-mono text-[10px] text-t3 mt-1">~22 days runway</p>
      </MCard>
      <p className="font-mono font-bold text-[10px] text-t3 mb-2.5 flex items-center gap-1.5">VIRTUAL CARDS <span className="font-mono text-[8px] text-t4 rounded-[3px] px-1 py-[1px]" style={{ border:`1px solid ${K.g700}` }}>SAMPLE</span></p>
      <div className="flex gap-2.5 overflow-x-auto mb-3.5 pb-1">
        {CARDS.map(c=>(
          <div key={c.last4} className="min-w-[190px] shrink-0 rounded-xl p-3.5" style={{ background:`linear-gradient(135deg,${K.g850},${K.indigoD})`, border:`1px solid ${(c as any).frozen?K.danger+"40":K.indigo+"40"}` }}>
            {(c as any).frozen && <Badge color={K.danger} className="mb-2 block">FROZEN</Badge>}
            <p className="font-mono text-[12px] text-t3 mb-1.5">•••• {c.last4}</p>
            <p className="font-mono font-bold text-[11px] mb-2" style={{ color:c.color }}>{c.name}</p>
            <ProgressBar value={(c.spent/c.limit)*100} color={c.color} height={3} />
            <p className="font-mono text-[9px] text-t4 mt-[3px]">${c.spent.toLocaleString()}/${c.limit.toLocaleString()}</p>
          </div>
        ))}
      </div>
      <p className="font-mono font-bold text-[10px] text-t3 mb-2.5">QUICK TOP-UP</p>
      <div className="flex gap-2 flex-wrap mb-3">
        {[500,1000,2500,5000].map(a=>(
          <button key={a} onClick={()=>setAmt(a)} className="py-2.5 px-4 font-mono text-[13px] font-bold rounded-[10px] cursor-pointer" style={{ background:a===amt?K.goldD:K.g850, border:`1px solid ${a===amt?K.gold:K.g700}`, color:a===amt?K.gold:K.t3 }}>${a.toLocaleString()}</button>
        ))}
      </div>
      <MBtn full variant="mint" onClick={()=>{topUpWallet(amt);addToast("success",`Wallet topped up by $${amt.toLocaleString()}`)}}>↑ Top Up $${amt.toLocaleString()}</MBtn>
    </div>
  );
}

function ChatScreen() {
  const [messages, setMessages] = useState([{ role:"assistant", text:"Hi! I'm SyncBrain. Ask me anything about your campaigns, signals, or performance." }]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior:"smooth" }); }, [messages]);

  const send = useCallback(async () => {
    if (!input.trim()) return;
    const q = input; setInput(""); setMessages(m=>[...m,{role:"user",text:q}]); setThinking(true);
    await new Promise(r=>setTimeout(r,1200));
    const ANSWERS: Record<string,string> = {
      roas:"Your best ROAS right now is 6.87× on Retargeting — Cart Abandon. The Bidding Agent has been optimizing bids for 2h 34m.",
      budget:"Your wallet balance is $84,200, giving you approximately 22 days of runway at current spend rates.",
      agent:"6 agents are currently deployed: Bidding Agent, Creative Agent, Smart Pacing, Signals Agent, SyncBrain Router, and OaaS Optimizer.",
      fraud:"KIKI validates every signal before enrichment and blocks invalid traffic (IVT) at ingestion. The fraud detection engine runs on every conversion event across all connected platforms.",
    };
    const k = q.toLowerCase().includes("roas")||q.toLowerCase().includes("best")?"roas":q.toLowerCase().includes("budget")||q.toLowerCase().includes("money")||q.toLowerCase().includes("wallet")?"budget":q.toLowerCase().includes("fraud")||q.toLowerCase().includes("ivt")?"fraud":"agent";
    setMessages(m=>[...m,{role:"assistant",text:ANSWERS[k]!}]); setThinking(false);
  }, [input]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-2">
        {messages.map((m,i)=>(
          <div key={i} className="flex mb-2.5" style={{ justifyContent:m.role==="user"?"flex-end":"flex-start" }}>
            <div style={{ background:m.role==="user"?K.blueD:K.g850, border:`1px solid ${m.role==="user"?K.blue+"40":K.g700}`, color:m.role==="user"?K.blue4:K.t2 }} className="max-w-[82%] py-[11px] px-3.5 rounded-xl font-sans text-[13px] leading-[1.6]">{m.text}</div>
          </div>
        ))}
        {thinking && (
          <div className="flex gap-[5px] py-2.5 px-3.5 bg-g850 rounded-xl w-fit" style={{ border:`1px solid ${K.green}30` }}>
            {[0,1,2].map(i=><span key={i} className="animate-kdls-pulse w-1.5 h-1.5 rounded-full" style={{ background:K.green, animationDelay:`${i*0.2}s` }}/>)}
          </div>
        )}
        <div ref={endRef}/>
      </div>
      <div className="py-2 px-4 flex gap-1.5 overflow-x-auto" style={{ borderTop:`1px solid ${K.g800}` }}>
        {["Best ROAS?","Budget left?","Fraud today?","Agents running?"].map(s=>(
          <button key={s} onClick={()=>setInput(s)} className="py-[5px] px-3 font-mono text-[10px] bg-g850 rounded-[20px] text-t3 cursor-pointer shrink-0 whitespace-nowrap" style={{ border:`1px solid ${K.g700}` }}>{s}</button>
        ))}
      </div>
      <div className="py-2.5 px-4 flex gap-2" style={{ borderTop:`1px solid ${K.g800}` }}>
        <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&send()} placeholder="Ask SyncBrain anything..."
          className="flex-1 bg-g800 rounded-[20px] py-[11px] px-4 font-sans text-[13px] text-t1 outline-none" style={{ border:`1px solid ${K.g700}` }}/>
        <MBtn variant="primary" onClick={send} style={{ borderRadius:"50%", padding:"11px", width:44, height:44, flexShrink:0 }}>→</MBtn>
      </div>
    </div>
  );
}

function NotificationsScreen() {
  const { notifications, markNotificationRead, markAllRead } = useKikiStore();
  const sevColors: Record<string,string> = { critical:K.danger, warning:K.warn, info:K.blue, success:K.mint };
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="py-3 px-4 flex items-center justify-between" style={{ borderBottom:`1px solid ${K.g800}` }}>
        <p className="font-mono font-bold text-[13px] text-t1">Notifications</p>
        <button onClick={markAllRead} className="font-mono text-[10px] text-kblue4 bg-none border-none cursor-pointer">Mark all read</button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {notifications.map(n=>(
          <div key={n.id} onClick={() => markNotificationRead(n.id)} className="py-3 px-4 cursor-pointer" style={{ borderBottom:`1px solid ${K.g800}`, background:n.read?K.void:K.g900, borderLeft:`3px solid ${n.read?"transparent":sevColors[n.severity]||K.t3}` }}>
            <div className="flex items-start justify-between mb-1">
              <div className="flex items-center gap-2">
                {!n.read && <div className="w-[7px] h-[7px] rounded-full shrink-0" style={{ background:sevColors[n.severity] }}/>}
                <p className="font-mono text-[12px]" style={{ fontWeight:n.read?400:700, color:n.read?K.t2:K.t1 }}>{n.title}</p>
              </div>
              <p className="font-mono text-[9px] text-t4 shrink-0 ml-2">{n.time}</p>
            </div>
            <p className="font-sans text-[12px] text-t3 leading-[1.5]">{n.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function MoreScreen({ onNav }: { onNav: (s: string) => void }) {
  const MORE_ITEMS = [
    { icon:"◈",label:"Analytics",screen:"analytics",color:K.blue },
    { icon:"⬡",label:"OaaS Tasks",screen:"oaas",color:K.oaas },
    { icon:"⬗",label:"Fraud & IVT",screen:"fraud",color:K.danger },
    { icon:"◉",label:"CRM",screen:"crm",color:K.crm },
    { icon:"▣",label:"Reports",screen:"reports",color:K.oaas },
    { icon:"▤",label:"Audit Log",screen:"audit",color:K.teal },
    { icon:"💱",label:"FX Wallet",screen:"wallet",color:K.gold },
    { icon:"⚙",label:"Settings",screen:"settings",color:K.t3 },
  ];
  return (
    <div className="flex-1 overflow-y-auto px-4 pb-4">
      {MORE_ITEMS.map(item=>(
        <div key={item.label} onClick={() => onNav(item.screen)} className="flex items-center gap-3.5 py-3.5 cursor-pointer" style={{ borderBottom:`1px solid ${K.g800}` }}>
          <div className="w-9 h-9 rounded-lg flex items-center justify-center text-base shrink-0" style={{ background:`${item.color}14`, color:item.color }}>{item.icon}</div>
          <span className="font-mono font-semibold text-[13px] text-t1 flex-1">{item.label}</span>
          <span className="font-mono text-[14px] text-t4">›</span>
        </div>
      ))}
    </div>
  );
}

// ─── Main Mobile App ──────────────────────────────────────
const TABS = [
  { id:"home",          icon:"⬛", label:"Home"      },
  { id:"campaigns",     icon:"⬡", label:"Campaigns"  },
  { id:"wallet",        icon:"◎", label:"Wallet"     },
  { id:"agents",        icon:"⚡", label:"Agents"     },
  { id:"notifications", icon:"🔔",label:"Alerts"     },
];

export default function MobileAppPage() {
  const router = useRouter();
  const [tab, setTab] = useState("home");
  const [chatOpen, setChatOpen] = useState(false);
  const { notifications } = useKikiStore();
  const unread = notifications.filter(n => !n.read).length;

  const renderScreen = () => {
    if (chatOpen) return <ChatScreen />;
    switch (tab) {
      case "campaigns": return <div className="flex-1 overflow-y-auto p-4"><p className="font-mono text-[14px] text-t3">Campaigns — see desktop for full view</p><button onClick={()=>router.push("/dashboard/campaigns")} className="mt-3 font-mono text-[11px] text-kblue4 bg-none rounded-lg py-2 px-3.5 cursor-pointer" style={{ border:`1px solid ${K.blue}` }}>Open in Dashboard →</button></div>;
      case "wallet":        return <WalletScreen />;
      case "agents":        return <AgentsScreen />;
      case "notifications": return <NotificationsScreen />;
      case "more":          return <MoreScreen onNav={setTab} />;
      default:              return <HomeScreen onNav={setTab} />;
    }
  };

  return (
    <div className="min-h-screen bg-g950 flex items-center justify-center p-6">
      {/* Phone frame */}
      <div className="w-[390px] h-[844px] bg-g950 rounded-[44px] overflow-hidden flex flex-col relative" style={{ boxShadow:`0 0 60px rgba(0,0,0,0.8), 0 0 0 1px ${K.g700}` }}>
        {/* Status bar */}
        <div className="h-12 flex items-end justify-between px-6 pb-2.5 shrink-0" style={{ background:K.void }}>
          <span className="font-mono font-bold text-[13px] text-t1">9:41</span>
          <div className="w-[120px] h-[22px] rounded-[11px]" style={{ background:K.void, border:`1px solid ${K.g700}` }}/>
          <span className="font-mono text-[10px] text-t2">100%</span>
        </div>

        {/* App header */}
        <div className="h-[52px] flex items-center justify-between px-[18px] shrink-0" style={{ background:K.void, borderBottom:`1px solid ${K.g800}` }}>
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => router.push("/")}>
            <Image src="/images/kiki.png" alt="KIKI" width={26} height={26} style={{ borderRadius:6 }} />
            <span className="font-mono font-bold text-[13px] text-t1">KIKI<span className="text-kblue">.</span>Agent</span>
          </div>
          <div className="flex gap-2 items-center">
            {chatOpen ? (
              <button onClick={() => setChatOpen(false)} className="font-mono text-[12px] text-t3 bg-none border-none cursor-pointer">✕ Close</button>
            ) : (
              <button onClick={() => setChatOpen(true)} className="py-[5px] px-3 rounded-2xl font-mono text-[10px] cursor-pointer" style={{ background:K.greenD, border:`1px solid ${K.green}40`, color:K.green }}>⬡ Ask AI</button>
            )}
          </div>
        </div>

        {/* Screen content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {renderScreen()}
        </div>

        {/* FAB */}
        {!chatOpen && (
          <button onClick={() => setChatOpen(true)} className="absolute bottom-20 right-[18px] w-[50px] h-[50px] rounded-full bg-kblue border-none flex items-center justify-center text-xl cursor-pointer" style={{ boxShadow:`0 4px 20px ${K.blue}60` }}>⬡</button>
        )}

        {/* Tab bar */}
        {!chatOpen && (
          <div className="h-[68px] flex items-center justify-around shrink-0 pb-2" style={{ background:K.void, borderTop:`1px solid ${K.g800}` }}>
            {TABS.map(t => {
              const isActive = tab === t.id;
              return (
                <button key={t.id} onClick={() => setTab(t.id)}
                  className="flex flex-col items-center gap-[3px] flex-1 bg-none border-none py-2 cursor-pointer">
                  <div className="relative">
                    <span className="text-lg transition-all" style={{ color:isActive?K.blue:K.t4 }}>{t.icon}</span>
                    {t.id==="notifications" && unread > 0 && (
                      <div className="absolute top-[-3px] right-[-3px] w-3.5 h-3.5 bg-kdanger rounded-full font-mono text-[8px] font-bold text-white flex items-center justify-center">{unread}</div>
                    )}
                  </div>
                  <span className="font-mono font-bold text-[9px] tracking-[0.04em]" style={{ color:isActive?K.blue:K.t4 }}>{t.label.toUpperCase()}</span>
                  {isActive && <div className="w-5 h-0.5 bg-kblue rounded-[1px]"/>}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
