"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useKikiStore } from "@/store";
import { K } from "@/lib/kdls";
import { Badge, ProgressBar, StatusBadge } from "@/components/ui";

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
      style={{ display:"inline-flex", alignItems:"center", justifyContent:"center", gap:6, padding:"11px 16px", background:bg[variant], color:co[variant], border:`1px solid ${variant==="secondary"?K.g700:"transparent"}`, borderRadius:10, fontFamily:K.mono, fontSize:13, fontWeight:600, cursor:"pointer", width:full?"100%":undefined, opacity:p?0.8:1, transition:"opacity 0.1s", ...style }}>
      {children}
    </button>
  );
};

const MCard = ({ children, accent, style }: { children: React.ReactNode; accent?: string; style?: React.CSSProperties }) => (
  <div style={{ background:K.g900, border:`1px solid ${K.g800}`, borderRadius:12, padding:16, position:"relative", overflow:"hidden", ...style }}>
    {accent && <div style={{ position:"absolute", top:0, left:0, right:0, height:1, background:`linear-gradient(90deg,transparent,${accent}80,transparent)` }} />}
    {children}
  </div>
);

const MStat = ({ label, value, color=K.t1 }: { label: string; value: string; color?: string }) => (
  <div style={{ padding:"12px 14px", background:K.g850, borderRadius:10, textAlign:"center" }}>
    <p style={{ fontFamily:K.mono, fontSize:16, fontWeight:700, color }}>{value}</p>
    <p style={{ fontFamily:K.mono, fontSize:9, letterSpacing:"0.12em", color:K.t4, marginTop:3 }}>{label}</p>
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
    <div style={{ flex:1, overflowY:"auto", padding:"0 16px 16px" }}>
      {/* Hero */}
      <div style={{ background:`linear-gradient(135deg,${K.g850},${K.g800})`, borderRadius:16, padding:18, marginBottom:14, border:`1px solid ${K.g700}` }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
          <div>
            <p style={{ fontFamily:K.mono, fontSize:9, letterSpacing:"0.14em", color:K.t4, marginBottom:4 }}>GOOD MORNING, ACME CORP</p>
            <p style={{ fontFamily:K.mono, fontSize:28, fontWeight:700, color:K.mint }}>4.23×</p>
            <p style={{ fontFamily:K.mono, fontSize:9, color:K.t3 }}>PLATFORM ROAS</p>
          </div>
          <div style={{ textAlign:"right" }}>
            <Badge color={K.mint} dot pulse style={{ marginBottom:8, display:"block" }}>{running} AGENTS</Badge>
            <p style={{ fontFamily:K.mono, fontSize:9, color:K.t3 }}>All nominal</p>
          </div>
        </div>
        <div style={{ display:"flex", gap:10 }}>
          {[{l:"CAC",v:"$21.40",c:K.blue},{l:"LTV",v:"$312",c:K.oaas},{l:"QUALITY",v:"94.2%",c:K.teal}].map(k=>(
            <div key={k.l} style={{ flex:1, padding:"8px 10px", background:"rgba(0,0,0,0.3)", borderRadius:8, textAlign:"center" }}>
              <p style={{ fontFamily:K.mono, fontSize:12, fontWeight:700, color:k.c }}>{k.v}</p>
              <p style={{ fontFamily:K.mono, fontSize:8, color:K.t4, marginTop:2 }}>{k.l}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Wallet */}
      <MCard accent={K.gold} style={{ marginBottom:14 }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div>
            <p style={{ fontFamily:K.mono, fontSize:9, letterSpacing:"0.14em", color:K.t4, marginBottom:4 }}>WALLET</p>
            <p style={{ fontFamily:K.mono, fontSize:24, fontWeight:700, color:K.gold }}>${(walletBalance/1000).toFixed(1)}K</p>
            <p style={{ fontFamily:K.mono, fontSize:9, color:K.t3 }}>~22 days runway</p>
          </div>
          <MBtn variant="mint" onClick={() => onNav("wallet")} style={{ borderRadius:20, padding:"8px 16px", fontSize:11 }}>↑ Top Up</MBtn>
        </div>
      </MCard>

      {/* Campaigns */}
      <p style={{ fontFamily:K.mono, fontSize:10, fontWeight:700, color:K.t3, marginBottom:10, display:"flex", alignItems:"center", gap:6 }}>CAMPAIGNS <span style={{ fontFamily:K.mono, fontSize:8, color:K.t4, border:`1px solid ${K.g700}`, borderRadius:3, padding:"1px 4px" }}>SAMPLE</span></p>
      {CAMPAIGNS.map(c => (
        <div key={c.name} style={{ background:K.g900, border:`1px solid ${K.g800}`, borderRadius:12, padding:14, marginBottom:8 }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:6 }}>
            <p style={{ fontFamily:K.mono, fontSize:12, fontWeight:700, color:K.t1 }}>{c.name}</p>
            <p style={{ fontFamily:K.mono, fontSize:14, fontWeight:700, color:c.roas>=4?K.mint:K.warn }}>{c.roas}×</p>
          </div>
          <StatusBadge status={c.status} />
        </div>
      ))}

      {/* AI CTA */}
      <div onClick={() => onNav("chat")} style={{ padding:14, background:K.greenT, border:`1px solid ${K.green}30`, borderRadius:12, cursor:"pointer", display:"flex", alignItems:"center", gap:12, marginTop:4 }}>
        <span style={{ fontSize:20 }}>⬡</span>
        <div>
          <p style={{ fontFamily:K.mono, fontSize:12, fontWeight:700, color:K.green }}>Ask SyncBrain</p>
          <p style={{ fontFamily:"Inter,sans-serif", fontSize:11, color:K.t3 }}>Get instant AI insights</p>
        </div>
        <span style={{ marginLeft:"auto", fontFamily:K.mono, fontSize:14, color:K.t4 }}>›</span>
      </div>
    </div>
  );
}

function AgentsScreen() {
  const { agents, toggleAgent } = useKikiStore();
  return (
    <div style={{ flex:1, overflowY:"auto", padding:"0 16px 16px" }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
        <p style={{ fontFamily:K.mono, fontSize:16, fontWeight:700, color:K.t1 }}>AI Agents</p>
        <Badge color={K.mint} dot pulse>{agents.filter(a=>a.status==="running").length} RUNNING</Badge>
      </div>
      {agents.map(a => (
        <MCard key={a.id} accent={a.status==="running"?a.color:undefined} style={{ marginBottom:10 }}>
          <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:8 }}>
            <div style={{ flex:1 }}>
              <p style={{ fontFamily:K.mono, fontSize:13, fontWeight:700, color:K.t1, marginBottom:3 }}>{a.name}</p>
              <StatusBadge status={a.status} />
            </div>
            <p style={{ fontFamily:K.mono, fontSize:13, fontWeight:700, color:a.color }}>{a.metric}</p>
          </div>
          <p style={{ fontFamily:K.mono, fontSize:10, color:K.t3, fontStyle:"italic", marginBottom:10, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{a.task}</p>
          <div style={{ display:"flex", gap:8 }}>
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
    <div style={{ flex:1, overflowY:"auto", padding:"0 16px 16px" }}>
      <MCard accent={K.gold} style={{ marginBottom:14, textAlign:"center" }}>
        <p style={{ fontFamily:K.mono, fontSize:9, letterSpacing:"0.14em", color:K.t4, marginBottom:6 }}>AVAILABLE BALANCE</p>
        <p style={{ fontFamily:K.mono, fontSize:36, fontWeight:700, color:K.gold }}>${(walletBalance/1000).toFixed(1)}K</p>
        <p style={{ fontFamily:K.mono, fontSize:10, color:K.t3, marginTop:4 }}>~22 days runway</p>
      </MCard>
      <p style={{ fontFamily:K.mono, fontSize:10, fontWeight:700, color:K.t3, marginBottom:10, display:"flex", alignItems:"center", gap:6 }}>VIRTUAL CARDS <span style={{ fontFamily:K.mono, fontSize:8, color:K.t4, border:`1px solid ${K.g700}`, borderRadius:3, padding:"1px 4px" }}>SAMPLE</span></p>
      <div style={{ display:"flex", gap:10, overflowX:"auto", marginBottom:14, paddingBottom:4 }}>
        {CARDS.map(c=>(
          <div key={c.last4} style={{ minWidth:190, flexShrink:0, background:`linear-gradient(135deg,${K.g850},${K.indigoD})`, border:`1px solid ${(c as any).frozen?K.danger+"40":K.indigo+"40"}`, borderRadius:12, padding:14 }}>
            {(c as any).frozen && <Badge color={K.danger} style={{ marginBottom:8, display:"block" }}>FROZEN</Badge>}
            <p style={{ fontFamily:K.mono, fontSize:12, color:K.t3, marginBottom:6 }}>•••• {c.last4}</p>
            <p style={{ fontFamily:K.mono, fontSize:11, fontWeight:700, color:c.color, marginBottom:8 }}>{c.name}</p>
            <ProgressBar value={(c.spent/c.limit)*100} color={c.color} height={3} />
            <p style={{ fontFamily:K.mono, fontSize:9, color:K.t4, marginTop:3 }}>${c.spent.toLocaleString()}/${c.limit.toLocaleString()}</p>
          </div>
        ))}
      </div>
      <p style={{ fontFamily:K.mono, fontSize:10, fontWeight:700, color:K.t3, marginBottom:10 }}>QUICK TOP-UP</p>
      <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:12 }}>
        {[500,1000,2500,5000].map(a=>(
          <button key={a} onClick={()=>setAmt(a)} style={{ padding:"10px 16px", fontFamily:K.mono, fontSize:13, fontWeight:700, background:a===amt?K.goldD:K.g850, border:`1px solid ${a===amt?K.gold:K.g700}`, borderRadius:10, color:a===amt?K.gold:K.t3, cursor:"pointer" }}>${a.toLocaleString()}</button>
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
      fraud:"Your data quality score is 99.1%. 127 fraudulent events were blocked today — saving approximately $4,240 in wasted spend.",
    };
    const k = q.toLowerCase().includes("roas")||q.toLowerCase().includes("best")?"roas":q.toLowerCase().includes("budget")||q.toLowerCase().includes("money")||q.toLowerCase().includes("wallet")?"budget":q.toLowerCase().includes("fraud")||q.toLowerCase().includes("ivt")?"fraud":"agent";
    setMessages(m=>[...m,{role:"assistant",text:ANSWERS[k]!}]); setThinking(false);
  }, [input]);

  return (
    <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
      <div style={{ flex:1, overflowY:"auto", padding:"16px 16px 8px" }}>
        {messages.map((m,i)=>(
          <div key={i} style={{ display:"flex", justifyContent:m.role==="user"?"flex-end":"flex-start", marginBottom:10 }}>
            <div style={{ maxWidth:"82%", padding:"11px 14px", borderRadius:12, background:m.role==="user"?K.blueD:K.g850, border:`1px solid ${m.role==="user"?K.blue+"40":K.g700}`, fontFamily:"Inter,sans-serif", fontSize:13, color:m.role==="user"?K.blue4:K.t2, lineHeight:1.6 }}>{m.text}</div>
          </div>
        ))}
        {thinking && (
          <div style={{ display:"flex", gap:5, padding:"10px 14px", background:K.g850, borderRadius:12, width:"fit-content", border:`1px solid ${K.green}30` }}>
            {[0,1,2].map(i=><span key={i} className="animate-kdls-pulse" style={{ width:6, height:6, borderRadius:"50%", background:K.green, animationDelay:`${i*0.2}s` }}/>)}
          </div>
        )}
        <div ref={endRef}/>
      </div>
      <div style={{ padding:"8px 16px", borderTop:`1px solid ${K.g800}`, display:"flex", gap:6, overflowX:"auto" }}>
        {["Best ROAS?","Budget left?","Fraud today?","Agents running?"].map(s=>(
          <button key={s} onClick={()=>setInput(s)} style={{ padding:"5px 12px", fontFamily:K.mono, fontSize:10, background:K.g850, border:`1px solid ${K.g700}`, borderRadius:20, color:K.t3, cursor:"pointer", flexShrink:0, whiteSpace:"nowrap" }}>{s}</button>
        ))}
      </div>
      <div style={{ padding:"10px 16px", borderTop:`1px solid ${K.g800}`, display:"flex", gap:8 }}>
        <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&send()} placeholder="Ask SyncBrain anything..."
          style={{ flex:1, background:K.g800, border:`1px solid ${K.g700}`, borderRadius:20, padding:"11px 16px", fontFamily:"Inter,sans-serif", fontSize:13, color:K.t1, outline:"none" }}/>
        <MBtn variant="primary" onClick={send} style={{ borderRadius:"50%", padding:"11px", width:44, height:44, flexShrink:0 }}>→</MBtn>
      </div>
    </div>
  );
}

function NotificationsScreen() {
  const { notifications, markNotificationRead, markAllRead } = useKikiStore();
  const sevColors: Record<string,string> = { critical:K.danger, warning:K.warn, info:K.blue, success:K.mint };
  return (
    <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
      <div style={{ padding:"12px 16px", borderBottom:`1px solid ${K.g800}`, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <p style={{ fontFamily:K.mono, fontSize:13, fontWeight:700, color:K.t1 }}>Notifications</p>
        <button onClick={markAllRead} style={{ fontFamily:K.mono, fontSize:10, color:K.blue4, background:"none", border:"none", cursor:"pointer" }}>Mark all read</button>
      </div>
      <div style={{ flex:1, overflowY:"auto" }}>
        {notifications.map(n=>(
          <div key={n.id} onClick={() => markNotificationRead(n.id)} style={{ padding:"12px 16px", borderBottom:`1px solid ${K.g800}`, background:n.read?K.void:K.g900, borderLeft:`3px solid ${n.read?"transparent":sevColors[n.severity]||K.t3}`, cursor:"pointer" }}>
            <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:4 }}>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                {!n.read && <div style={{ width:7, height:7, borderRadius:"50%", background:sevColors[n.severity], flexShrink:0 }}/>}
                <p style={{ fontFamily:K.mono, fontSize:12, fontWeight:n.read?400:700, color:n.read?K.t2:K.t1 }}>{n.title}</p>
              </div>
              <p style={{ fontFamily:K.mono, fontSize:9, color:K.t4, flexShrink:0, marginLeft:8 }}>{n.time}</p>
            </div>
            <p style={{ fontFamily:"Inter,sans-serif", fontSize:12, color:K.t3, lineHeight:1.5 }}>{n.body}</p>
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
    <div style={{ flex:1, overflowY:"auto", padding:"0 16px 16px" }}>
      {MORE_ITEMS.map(item=>(
        <div key={item.label} onClick={() => onNav(item.screen)} style={{ display:"flex", alignItems:"center", gap:14, padding:"14px 0", borderBottom:`1px solid ${K.g800}`, cursor:"pointer" }}>
          <div style={{ width:36, height:36, borderRadius:8, background:`${item.color}14`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, color:item.color, flexShrink:0 }}>{item.icon}</div>
          <span style={{ fontFamily:K.mono, fontSize:13, fontWeight:600, color:K.t1, flex:1 }}>{item.label}</span>
          <span style={{ fontFamily:K.mono, fontSize:14, color:K.t4 }}>›</span>
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
      case "home":          return <HomeScreen          onNav={setTab} />;
      case "campaigns":     return <div style={{ flex:1, overflowY:"auto", padding:"16px" }}><p style={{ fontFamily:K.mono, fontSize:14, color:K.t3 }}>Campaigns — see desktop for full view</p><button onClick={()=>router.push("/dashboard/campaigns")} style={{ marginTop:12, fontFamily:K.mono, fontSize:11, color:K.blue4, background:"none", border:`1px solid ${K.blue}`, borderRadius:8, padding:"8px 14px", cursor:"pointer" }}>Open in Dashboard →</button></div>;
      case "wallet":        return <WalletScreen />;
      case "agents":        return <AgentsScreen />;
      case "notifications": return <NotificationsScreen />;
      case "more":          return <MoreScreen onNav={setTab} />;
      default:              return <HomeScreen onNav={setTab} />;
    }
  };

  return (
    <div style={{ minHeight:"100vh", background:K.g950, display:"flex", alignItems:"center", justifyContent:"center", padding:24 }}>
      {/* Phone frame */}
      <div style={{ width:390, height:844, background:K.g950, borderRadius:44, boxShadow:`0 0 60px rgba(0,0,0,0.8), 0 0 0 1px ${K.g700}`, overflow:"hidden", display:"flex", flexDirection:"column", position:"relative" }}>
        {/* Status bar */}
        <div style={{ height:48, background:K.void, display:"flex", alignItems:"flex-end", justifyContent:"space-between", padding:"0 24px 10px", flexShrink:0 }}>
          <span style={{ fontFamily:K.mono, fontSize:13, fontWeight:700, color:K.t1 }}>9:41</span>
          <div style={{ width:120, height:22, background:K.void, borderRadius:11, border:`1px solid ${K.g700}` }}/>
          <span style={{ fontFamily:K.mono, fontSize:10, color:K.t2 }}>100%</span>
        </div>

        {/* App header */}
        <div style={{ height:52, background:K.void, borderBottom:`1px solid ${K.g800}`, display:"flex", alignItems:"center", justifyContent:"space-between", padding:"0 18px", flexShrink:0 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <img src="/images/kiki.png" alt="KIKI" width={26} height={26} style={{ borderRadius:6 }} />
            <span style={{ fontFamily:K.mono, fontWeight:700, fontSize:13, color:K.t1 }}>KIKI<span style={{ color:K.blue }}>.</span>Agent</span>
          </div>
          <div style={{ display:"flex", gap:8, alignItems:"center" }}>
            {chatOpen ? (
              <button onClick={() => setChatOpen(false)} style={{ fontFamily:K.mono, fontSize:12, color:K.t3, background:"none", border:"none", cursor:"pointer" }}>✕ Close</button>
            ) : (
              <button onClick={() => setChatOpen(true)} style={{ padding:"5px 12px", background:K.greenD, border:`1px solid ${K.green}40`, borderRadius:16, fontFamily:K.mono, fontSize:10, color:K.green, cursor:"pointer" }}>⬡ Ask AI</button>
            )}
          </div>
        </div>

        {/* Screen content */}
        <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
          {renderScreen()}
        </div>

        {/* FAB */}
        {!chatOpen && (
          <button onClick={() => setChatOpen(true)} style={{ position:"absolute", bottom:80, right:18, width:50, height:50, borderRadius:"50%", background:K.blue, border:"none", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, boxShadow:`0 4px 20px ${K.blue}60`, cursor:"pointer" }}>⬡</button>
        )}

        {/* Tab bar */}
        {!chatOpen && (
          <div style={{ height:68, background:K.void, borderTop:`1px solid ${K.g800}`, display:"flex", alignItems:"center", justifyContent:"space-around", flexShrink:0, paddingBottom:8 }}>
            {TABS.map(t => {
              const isActive = tab === t.id;
              return (
                <button key={t.id} onClick={() => setTab(t.id)}
                  style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:3, flex:1, background:"none", border:"none", padding:"8px 0", cursor:"pointer" }}>
                  <div style={{ position:"relative" }}>
                    <span style={{ fontSize:18, color:isActive?K.blue:K.t4, transition:"all 0.15s" }}>{t.icon}</span>
                    {t.id==="notifications" && unread > 0 && (
                      <div style={{ position:"absolute", top:-3, right:-3, width:14, height:14, background:K.danger, borderRadius:"50%", fontFamily:K.mono, fontSize:8, fontWeight:700, color:"white", display:"flex", alignItems:"center", justifyContent:"center" }}>{unread}</div>
                    )}
                  </div>
                  <span style={{ fontFamily:K.mono, fontSize:9, fontWeight:700, letterSpacing:"0.04em", color:isActive?K.blue:K.t4 }}>{t.label.toUpperCase()}</span>
                  {isActive && <div style={{ width:20, height:2, background:K.blue, borderRadius:1 }}/>}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
