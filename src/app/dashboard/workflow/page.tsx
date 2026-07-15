"use client";
import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, Badge, Button, Toggle } from "@/components/ui";
import { K } from "@/lib/kdls";
import { useInsights } from "@/hooks/useInsights";

const WORKFLOWS = [
  {
    name: "Pause Low ROAS Campaigns",
    description: "Automatically pause any campaign with ROAS below 2.0× for 24h to prevent budget waste",
    trigger: "ROAS check every 30 min",
    conditions: ["Campaign ROAS < 2.0×", "Active for > 24 hours", "Spend > $100"],
    actions: ["Pause campaign", "Send Slack alert", "Log to audit trail"],
    lastFired: "14:32 today",
    firesCount: 47,
    active: true,
    color: K.danger,
  },
  {
    name: "Scale High-Performers",
    description: "Increase budget by 20% when CTR exceeds 5% and ROAS is above 4.0×",
    trigger: "Performance check every 15 min",
    conditions: ["CTR > 5%", "ROAS > 4.0×", "Budget < 80% consumed"],
    actions: ["Increase budget +20%", "Update bid strategy", "Notify account manager"],
    lastFired: "12:15 today",
    firesCount: 128,
    active: true,
    color: K.mint,
  },
  {
    name: "Creative Fatigue Detection",
    description: "Rotate creatives when frequency exceeds 3.5 and CTR drops below 1.5%",
    trigger: "Creative metrics every 1 hour",
    conditions: ["Frequency > 3.5", "CTR < 1.5%", "Impressions > 50K"],
    actions: ["Swap to next creative variant", "Reset frequency cap", "Log rotation event"],
    lastFired: "Yesterday 18:40",
    firesCount: 23,
    active: true,
    color: K.gold,
  },
  {
    name: "Budget Rebalancer",
    description: "Shift 10% of budget from underperforming to top-performing channels daily",
    trigger: "Daily at 6:00 AM UTC",
    conditions: ["Channel ROAS delta > 30%", "Minimum spend threshold met", "Campaign active > 3 days"],
    actions: ["Reduce losing channel budget", "Increase winning channel budget", "Send daily digest"],
    lastFired: "Today 06:00",
    firesCount: 89,
    active: true,
    color: K.blue,
  },
  {
    name: "Anomaly Auto-Pause",
    description: "Emergency pause when CTR drops >40% in 2 hours or spend spikes 3× normal",
    trigger: "Anomaly detection every 5 min",
    conditions: ["CTR drop > 40% in 2h", "OR spend spike > 3× hourly avg", "AND not already paused"],
    actions: ["Emergency pause all affected campaigns", "Page on-call operator", "Create incident ticket"],
    lastFired: "3 days ago",
    firesCount: 5,
    active: true,
    color: K.danger,
  },
  {
    name: "Weekend Budget Shift",
    description: "Reduce weekday budget by 15% on Saturdays and shift to social channels",
    trigger: "Every Saturday 00:00 UTC",
    conditions: ["Day = Saturday", "Campaign type = evergreen", "Not in blackout period"],
    actions: ["Reduce search budget -15%", "Increase social budget +25%", "Notify team in Slack"],
    lastFired: "Jul 5, 2026",
    firesCount: 12,
    active: false,
    color: K.teal,
  },
];

export default function WorkflowPage() {
  const { data, loading } = useInsights();
  const fires = data?.workflow?.length ?? 0;
  const budgetSaved = data?.savings?.totalSaved ?? 0;
  const [filter, setFilter] = useState<"all" | "active" | "inactive">("all");
  const filtered = filter === "all" ? WORKFLOWS : filter === "active" ? WORKFLOWS.filter(w => w.active) : WORKFLOWS.filter(w => !w.active);

  return (
    <DashboardLayout>
      <div style={{ padding: "24px 28px", maxWidth: 1400 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 22 }}>
          <div>
            <h1 style={{ fontFamily: K.mono, fontWeight: 700, fontSize: 18, color: K.t1, letterSpacing: "-0.02em", marginBottom: 4 }}>Automation Builder</h1>
            <p style={{ fontFamily: K.mono, fontSize: 11, color: K.t3 }}>Workflow rules · Trigger conditions · Automated actions · {WORKFLOWS.filter(w => w.active).length} active rules</p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ display: "flex", gap: 4, background: K.g900, border: `1px solid ${K.g800}`, borderRadius: 2, padding: 3 }}>
              {(["all", "active", "inactive"] as const).map(f => (
                <button key={f} onClick={() => setFilter(f)}
                  style={{ padding: "5px 12px", fontFamily: K.mono, fontSize: 10, fontWeight: 600, letterSpacing: "0.06em", color: filter === f ? K.t1 : K.t4, background: filter === f ? K.g800 : "transparent", border: "none", borderRadius: 2, cursor: "pointer", textTransform: "uppercase" }}>
                  {f}
                </button>
              ))}
            </div>
            <Button variant="primary" size="sm">+ New Rule</Button>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 16 }}>
          {[{ label: "Active Rules", value: `${WORKFLOWS.filter(w => w.active).length}`, color: K.mint },
            { label: "Triggered (30d)", value: loading ? "…" : String(fires), color: K.blue },
            { label: "Budget Saved", value: loading ? "…" : `$${Number(budgetSaved).toLocaleString()}`, color: K.gold },
            { label: "Avg Response Time", value: "< 1 min", color: K.teal },
          ].map((s, i) => (
            <Card key={i} accent={s.color}>
              <p style={{ fontFamily: K.mono, fontSize: 9, letterSpacing: "0.14em", color: K.t4, marginBottom: 6 }}>{s.label}</p>
              <p style={{ fontFamily: K.mono, fontSize: 20, fontWeight: 700, color: s.color }}>{s.value}</p>
            </Card>
          ))}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {filtered.map((wf, i) => (
            <Card key={i} accent={wf.color}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                    <h3 style={{ fontFamily: K.mono, fontWeight: 700, fontSize: 13, color: K.t1 }}>{wf.name}</h3>
                    <Badge color={wf.active ? K.mint : K.t3} dot pulse={wf.active}>{wf.active ? "ACTIVE" : "PAUSED"}</Badge>
                  </div>
                  <p style={{ fontFamily: K.sans, fontSize: 11, color: K.t3, lineHeight: 1.5, maxWidth: 600 }}>{wf.description}</p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
                  <div style={{ textAlign: "right" }}>
                    <p style={{ fontFamily: K.mono, fontSize: 10, color: K.t4 }}>Last fired</p>
                    <p style={{ fontFamily: K.mono, fontSize: 11, fontWeight: 600, color: K.t2 }}>{wf.lastFired}</p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <p style={{ fontFamily: K.mono, fontSize: 10, color: K.t4 }}>Total fires</p>
                    <p style={{ fontFamily: K.mono, fontSize: 11, fontWeight: 700, color: wf.color }}>{wf.firesCount}</p>
                  </div>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                <div style={{ padding: "10px 12px", background: K.g850, borderRadius: 2 }}>
                  <p style={{ fontFamily: K.mono, fontSize: 9, letterSpacing: "0.1em", color: K.t4, marginBottom: 4 }}>TRIGGER</p>
                  <p style={{ fontFamily: K.mono, fontSize: 10, color: K.blue }}>{wf.trigger}</p>
                </div>
                <div style={{ padding: "10px 12px", background: K.g850, borderRadius: 2 }}>
                  <p style={{ fontFamily: K.mono, fontSize: 9, letterSpacing: "0.1em", color: K.t4, marginBottom: 4 }}>CONDITIONS</p>
                  {wf.conditions.map((c, j) => (
                    <p key={j} style={{ fontFamily: K.mono, fontSize: 10, color: K.t2, marginBottom: 1 }}>{c}</p>
                  ))}
                </div>
                <div style={{ padding: "10px 12px", background: K.g850, borderRadius: 2 }}>
                  <p style={{ fontFamily: K.mono, fontSize: 9, letterSpacing: "0.1em", color: K.t4, marginBottom: 4 }}>ACTIONS</p>
                  {wf.actions.map((a, j) => (
                    <p key={j} style={{ fontFamily: K.mono, fontSize: 10, color: K.mint, marginBottom: 1 }}>→ {a}</p>
                  ))}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
