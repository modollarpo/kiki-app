"use client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, Badge, ProgressBar, StatCard } from "@/components/ui";
import { K } from "@/lib/kdls";
import { useInsights } from "@/hooks/useInsights";

const SERVICES = [
  { name: "SyncBrain™", category: "AI Engine", status: "healthy", uptime: 99.99, p99: 14, region: "us-east-1" },
  { name: "Signal Pipeline", category: "Data Ingestion", status: "healthy", uptime: 99.97, p99: 8, region: "us-east-1" },
  { name: "Bidding Engine", category: "Ad Operations", status: "healthy", uptime: 99.98, p99: 22, region: "us-west-2" },
  { name: "Creative AI", category: "Generative", status: "degraded", uptime: 99.81, p99: 340, region: "eu-west-1" },
  { name: "Fraud Detection", category: "Security", status: "healthy", uptime: 99.99, p99: 6, region: "us-east-1" },
  { name: "Consent Manager", category: "Compliance", status: "healthy", uptime: 99.99, p99: 3, region: "eu-central-1" },
  { name: "Analytics OLAP", category: "Query Engine", status: "healthy", uptime: 99.96, p99: 89, region: "us-west-2" },
  { name: "Notification Hub", category: "Messaging", status: "error", uptime: 99.42, p99: 520, region: "us-east-1" },
];

function StatusDot({ status }: { status: string }) {
  const color = status === "healthy" ? K.mint : status === "degraded" ? K.warn : K.danger;
  return <span style={{ width: 7, height: 7, borderRadius: "50%", background: color, display: "inline-block", boxShadow: `0 0 8px ${color}60`, flexShrink: 0 }} />;
}

export default function AdminPage() {
  const { data, loading } = useInsights();
  const admin = data?.admin;
  const healthy = SERVICES.filter(s => s.status === "healthy").length;
  const degraded = SERVICES.filter(s => s.status === "degraded").length;
  const errored = SERVICES.filter(s => s.status === "error").length;

  return (
    <DashboardLayout>
      <div style={{ padding: "24px 28px", maxWidth: 1400 }}>
        <div style={{ marginBottom: 22 }}>
          <h1 style={{ fontFamily: K.mono, fontWeight: 700, fontSize: 18, color: K.t1, letterSpacing: "-0.02em", marginBottom: 4 }}>Admin Health</h1>
          <p style={{ fontFamily: K.mono, fontSize: 11, color: K.t3 }}>Platform service status · Uptime · Latency · Region health</p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 16 }}>
          <StatCard label="Services Healthy" value={`${healthy}/${SERVICES.length}`} accent={K.mint} sub={`${errored} critical, ${degraded} degraded`} />
          <StatCard label="Active Agents" value={String(admin?.runningAgents ?? "—")} accent={K.blue} sub={`${admin?.totalAgents ?? 0} total configured`} />
          <StatCard label="Live Campaigns" value={String(admin?.campaigns ?? "—")} accent={K.teal} sub={`${admin?.wallets ?? 0} funded wallets`} />
          <StatCard label="Platform Spend" value={loading ? "…" : `$${Number(admin?.spend ?? 0).toLocaleString()}`} accent={K.warn} sub={`${admin?.users ?? 0} users`} />
        </div>

        <Card padding={0}>
          <div style={{ padding: "14px 20px", borderBottom: `1px solid ${K.g800}` }}>
            <h2 style={{ fontFamily: K.mono, fontWeight: 700, fontSize: 13, color: K.t1 }}>Service Status</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "180px 120px 80px 100px 120px 100px", gap: 12, padding: "8px 20px", borderBottom: `1px solid ${K.g800}`, background: K.g950 }}>
            {["SERVICE", "CATEGORY", "STATUS", "UPTIME", "p99 LATENCY", "REGION"].map(h => (
              <span key={h} style={{ fontFamily: K.mono, fontSize: 9, letterSpacing: "0.1em", color: K.t4 }}>{h}</span>
            ))}
          </div>
          {SERVICES.map((svc, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "180px 120px 80px 100px 120px 100px", gap: 12, padding: "12px 20px", borderBottom: `1px solid ${K.g900}`, alignItems: "center" }}
              onMouseEnter={e => (e.currentTarget.style.background = K.g850)} onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <StatusDot status={svc.status} />
                <span style={{ fontFamily: K.mono, fontSize: 11, fontWeight: 600, color: K.t1 }}>{svc.name}</span>
              </div>
              <span style={{ fontFamily: K.mono, fontSize: 10, color: K.t3 }}>{svc.category}</span>
              <Badge color={svc.status === "healthy" ? K.mint : svc.status === "degraded" ? K.warn : K.danger} dot pulse={svc.status === "healthy"}>
                {svc.status === "healthy" ? "OK" : svc.status === "degraded" ? "WARN" : "ERR"}
              </Badge>
              <div>
                <span style={{ fontFamily: K.mono, fontSize: 11, fontWeight: 600, color: svc.uptime >= 99.95 ? K.mint : svc.uptime >= 99.8 ? K.warn : K.danger }}>
                  {svc.uptime.toFixed(2)}%
                </span>
              </div>
              <div>
                <span style={{ fontFamily: K.mono, fontSize: 11, color: svc.p99 < 50 ? K.mint : svc.p99 < 200 ? K.warn : K.danger }}>
                  {svc.p99}ms
                </span>
              </div>
              <span style={{ fontFamily: K.mono, fontSize: 9, color: K.t4 }}>{svc.region}</span>
            </div>
          ))}
        </Card>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Card>
            <h2 style={{ fontFamily: K.mono, fontWeight: 700, fontSize: 13, color: K.t1, marginBottom: 14 }}>Capacity Utilization</h2>
            {[{ name: "Compute (GPU)", value: 67, color: K.blue }, { name: "Memory (RAM)", value: 54, color: K.teal }, { name: "Storage (SSD)", value: 38, color: K.gold }, { name: "Network I/O", value: 29, color: K.mint }].map((r, i) => (
              <div key={i} style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontFamily: K.mono, fontSize: 10, color: K.t3 }}>{r.name}</span>
                  <span style={{ fontFamily: K.mono, fontSize: 11, fontWeight: 700, color: r.color }}>{r.value}%</span>
                </div>
                <ProgressBar value={r.value} color={r.color} height={5} glow />
              </div>
            ))}
          </Card>

          <Card>
            <h2 style={{ fontFamily: K.mono, fontWeight: 700, fontSize: 13, color: K.t1, marginBottom: 14 }}>Recent Incidents</h2>
            {[
              { time: "2h ago", svc: "Notification Hub", severity: "P2", desc: "Elevated error rate on email delivery", status: "investigating" },
              { time: "1d ago", svc: "Creative AI", severity: "P3", desc: "p99 latency spike from model inference backlog", status: "monitoring" },
              { time: "5d ago", svc: "Signal Pipeline", severity: "P2", desc: "Ingestion delay from upstream provider outage", status: "resolved" },
            ].map((inc, i) => (
              <div key={i} style={{ padding: "10px 12px", marginBottom: 8, background: K.g850, borderRadius: 2, borderLeft: `3px solid ${inc.severity === "P2" ? K.warn : K.danger}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                  <span style={{ fontFamily: K.mono, fontSize: 11, fontWeight: 600, color: K.t1 }}>{inc.svc}</span>
                  <Badge color={inc.status === "resolved" ? K.mint : K.warn}>{inc.status.toUpperCase()}</Badge>
                </div>
                <p style={{ fontFamily: K.mono, fontSize: 10, color: K.t3, marginBottom: 2 }}>{inc.desc}</p>
                <span style={{ fontFamily: K.mono, fontSize: 9, color: K.t4 }}>{inc.severity} · {inc.time}</span>
              </div>
            ))}
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
