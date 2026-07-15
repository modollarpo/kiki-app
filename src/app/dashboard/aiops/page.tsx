"use client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatCard, Card, Badge, ProgressBar, AIThinking } from "@/components/ui";
import { K } from "@/lib/kdls";
import { useInsights } from "@/hooks/useInsights";

const MODELS = [
  { name:"LTV Predictor v5", type:"Prediction", status:"deployed", accuracy:"R² 0.94", latency:"8ms", lastTrained:"2h ago" },
  { name:"Fraud Detector v3", type:"Classification", status:"deployed", accuracy:"F1 0.97", latency:"3ms", lastTrained:"6h ago" },
  { name:"Creative Scorer v2", type:"Ranking", status:"training", accuracy:"—", latency:"—", lastTrained:"In progress" },
  { name:"Bid Optimizer v4", type:"Reinforcement", status:"deployed", accuracy:"Reward 0.89", latency:"12ms", lastTrained:"1d ago" },
];

const EXPERIMENTS = [
  { name:"Multi-touch attribution v2", status:"running", metric:"Lift +12%", progress:68 },
  { name:"Dark social detection", status:"running", metric:"Precision 0.84", progress:42 },
  { name:"Cross-device identity", status:"queued", metric:"—", progress:0 },
];

export default function AIOpsPage() {
  const { data, loading } = useInsights();
  const aiops = data?.aiops ?? { metrics: [], uptime: 0, activeServices: 0 };
  const deployed = MODELS.filter(m => m.status === "deployed").length;

  return (
    <DashboardLayout>
      <div style={{ padding:"24px 28px", maxWidth:1400 }}>
        <div style={{ marginBottom:22 }}>
          <h1 style={{ fontFamily:K.mono, fontWeight:700, fontSize:18, color:K.t1, letterSpacing:"-0.02em", marginBottom:4 }}>AI Ops & MLOps</h1>
          <p style={{ fontFamily:K.mono, fontSize:11, color:K.t3 }}>Model registry · training queue · experiments</p>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:16 }}>
          <StatCard label="Active Agents" value={loading ? "…" : String(aiops.activeServices)} accent={K.mint} sub="Running services" />
          <StatCard label="Avg p99 Latency" value="8.3ms" accent={K.warn} sub="Model inference" />
          <StatCard label="Avg Uptime" value={loading ? "…" : `${aiops.uptime}%`} accent={K.blue} />
          <StatCard label="Deployed Models" value={String(deployed)} accent={K.teal} sub="ML registry" />
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:12 }}>
          <Card accent={K.mint}>
            <h3 style={{ fontFamily:K.mono, fontWeight:700, fontSize:13, color:K.t1, marginBottom:14, display:"flex", alignItems:"center", gap:8 }}>Model Registry <Badge color={K.t4} style={{ fontSize:8 }}>SAMPLE</Badge></h3>
            {MODELS.map((m, i) => (
              <div key={i} style={{ padding:"10px 12px", marginBottom:8, background:K.g850, borderRadius:2, border:`1px solid ${m.status === "deployed" ? K.mint + "30" : K.g700}` }}>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:4 }}>
                  <span style={{ fontFamily:K.mono, fontSize:11, fontWeight:700, color:K.t1 }}>{m.name}</span>
                  <Badge color={m.status === "deployed" ? K.mint : K.warn}>{m.status.toUpperCase()}</Badge>
                </div>
                <div style={{ display:"flex", gap:16 }}>
                  <span style={{ fontFamily:K.mono, fontSize:10, color:K.t3 }}>{m.type}</span>
                  <span style={{ fontFamily:K.mono, fontSize:10, color:K.t3 }}>{m.accuracy}</span>
                  <span style={{ fontFamily:K.mono, fontSize:10, color:K.t3 }}>{m.latency}</span>
                  <span style={{ fontFamily:K.mono, fontSize:10, color:K.t4 }}>{m.lastTrained}</span>
                </div>
              </div>
            ))}
          </Card>

          <Card accent={K.blue}>
            <h3 style={{ fontFamily:K.mono, fontWeight:700, fontSize:13, color:K.t1, marginBottom:14, display:"flex", alignItems:"center", gap:8 }}>Experiments <Badge color={K.t4} style={{ fontSize:8 }}>SAMPLE</Badge></h3>
            {EXPERIMENTS.map((e, i) => (
              <div key={i} style={{ marginBottom:14 }}>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:4 }}>
                  <span style={{ fontFamily:K.mono, fontSize:11, fontWeight:700, color:K.t1 }}>{e.name}</span>
                  <Badge color={e.status === "running" ? K.blue : K.t3}>{e.status}</Badge>
                </div>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:4 }}>
                  <span style={{ fontFamily:K.mono, fontSize:10, color:K.t3 }}>{e.metric}</span>
                  <span style={{ fontFamily:K.mono, fontSize:10, color:K.t4 }}>{e.progress}%</span>
                </div>
                {e.progress > 0 && <ProgressBar value={e.progress} color={K.blue} height={3} />}
              </div>
            ))}
            <div style={{ marginTop:8 }}>
              <AIThinking label="Auto-scaling inference endpoints based on demand..." />
            </div>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
