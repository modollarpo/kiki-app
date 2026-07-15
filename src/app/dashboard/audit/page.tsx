"use client";
import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, Badge, Button } from "@/components/ui";
import { K } from "@/lib/kdls";
import { useInsights } from "@/hooks/useInsights";

const ACTION_COLORS: Record<string, string> = {
  USER_LOGIN: K.blue, CAMPAIGN_CREATED: K.mint, AGENT_PAUSED: K.warn,
  FRAUD_BLOCKED: K.danger, ROLE_ASSIGNED: K.oaas, BUDGET_ALERT: K.gold,
  CREATIVE_APPROVED: K.mint, SYNCBRAIN_DECISION: K.teal, API_KEY_ROTATED: K.warn,
  CONSENT_UPDATED: K.blue, REPORT_EXPORTED: K.t3, ANOMALY_DETECTED: K.danger,
  WEBHOOK_CREATED: K.blue, BILLING_CHARGE: K.gold,
};

const sevOf = (action: string) => {
  const a = (action ?? "").toLowerCase();
  if (a.includes("block") || a.includes("anomal") || a.includes("fraud") || a.includes("alert") || a.includes("error")) return "critical";
  if (a.includes("pause") || a.includes("rotate") || a.includes("warn")) return "warn";
  return "info";
};

export default function AuditPage() {
  const { data, loading } = useInsights();
  const raw = data?.audit ?? [];
  const EVENTS = raw.map((e: any) => {
    const severity = sevOf(e.action);
    return {
      time: e.time ? new Date(e.time).toLocaleTimeString() : "—",
      actor: e.source ?? "agent",
      role: e.source === "agent" ? "agent" : "system",
      action: e.action,
      resource: e.details?.slice(0, 24) ?? "—",
      detail: e.details ?? "—",
      severity,
    };
  });

  const [filter, setFilter] = useState<string>("all");
  const filtered = filter === "all" ? EVENTS : EVENTS.filter(e => e.severity === filter);

  return (
    <DashboardLayout>
      <div style={{ padding: "24px 28px", maxWidth: 1400 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 22 }}>
          <div>
            <h1 style={{ fontFamily: K.mono, fontWeight: 700, fontSize: 18, color: K.t1, letterSpacing: "-0.02em", marginBottom: 4 }}>Audit Log</h1>
            <p style={{ fontFamily: K.mono, fontSize: 11, color: K.t3 }}>All system events · User actions · Security events · {loading ? "…" : `${EVENTS.length} events`}</p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ display: "flex", gap: 4, background: K.g900, border: `1px solid ${K.g800}`, borderRadius: 2, padding: 3 }}>
              {["all", "info", "warn", "critical"].map(f => (
                <button key={f} onClick={() => setFilter(f)}
                  style={{ padding: "5px 12px", fontFamily: K.mono, fontSize: 10, fontWeight: 600, letterSpacing: "0.06em", color: filter === f ? K.t1 : K.t4, background: filter === f ? K.g800 : "transparent", border: "none", borderRadius: 2, cursor: "pointer", textTransform: "uppercase" }}>
                  {f}
                </button>
              ))}
            </div>
            <Button variant="secondary" size="sm">Export CSV</Button>
          </div>
        </div>

        <Card padding={0}>
          <div style={{ display: "grid", gridTemplateColumns: "80px 140px 100px 200px 1fr 80px", gap: 12, padding: "8px 20px", borderBottom: `1px solid ${K.g800}`, background: K.g950 }}>
            {["TIME", "ACTOR", "ACTION", "RESOURCE", "DETAIL", "LEVEL"].map(h => (
              <span key={h} style={{ fontFamily: K.mono, fontSize: 9, letterSpacing: "0.1em", color: K.t4 }}>{h}</span>
            ))}
          </div>
          {filtered.map((e, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "80px 140px 100px 200px 1fr 80px", gap: 12, padding: "10px 20px", borderBottom: `1px solid ${K.g900}`, alignItems: "center" }}
              onMouseEnter={e2 => (e2.currentTarget.style.background = K.g850)} onMouseLeave={e2 => (e2.currentTarget.style.background = "transparent")}>
              <span style={{ fontFamily: K.mono, fontSize: 10, color: K.t4 }}>{e.time}</span>
              <div>
                <span style={{ fontFamily: K.mono, fontSize: 10, fontWeight: 600, color: K.t1 }}>{e.actor}</span>
                {e.role !== "agent" && <span style={{ fontFamily: K.mono, fontSize: 8, color: K.t4, marginLeft: 4 }}>({e.role})</span>}
              </div>
              <Badge color={ACTION_COLORS[e.action] || K.t3}>{e.action}</Badge>
              <span style={{ fontFamily: K.mono, fontSize: 10, color: K.t2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.resource}</span>
              <span style={{ fontFamily: K.mono, fontSize: 10, color: K.t3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.detail}</span>
              <Badge color={e.severity === "critical" ? K.danger : e.severity === "warn" ? K.warn : K.t3} dot pulse={e.severity === "critical"}>
                {e.severity.toUpperCase()}
              </Badge>
            </div>
          ))}
        </Card>
      </div>
    </DashboardLayout>
  );
}
