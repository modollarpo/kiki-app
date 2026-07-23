"use client";
import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { RoleGuard } from "@/components/layout/RoleGuard";
import { Card, Badge, Button, ScrollableTable } from "@/components/ui";
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
  const EVENTS = raw.map((e: { time: string; source: string; action: string; details: string }) => {
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
    <RoleGuard allowedRoles={["admin", "superadmin"]}>
      <DashboardLayout>
        <div className="max-w-[1400px] p-[clamp(14px,3vw,28px)]">
        <div className="flex flex-wrap justify-between items-start gap-3 mb-5">
          <div>
            <h1 className="font-mono font-bold text-lg text-white tracking-tight mb-1">Audit Log</h1>
            <p className="font-mono text-[11px] text-gray-500">All system events · User actions · Security events · {loading ? "…" : `${EVENTS.length} events`}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="flex flex-wrap gap-1 p-[3px] rounded-sm bg-g900 border border-g800">
              {["all", "info", "warn", "critical"].map(f => (
                <button key={f} onClick={() => setFilter(f)}
                  className="font-mono text-[10px] font-semibold tracking-wider px-3 py-[5px] rounded-sm cursor-pointer uppercase"
                  style={{ color: filter === f ? K.t1 : K.t4, background: filter === f ? K.g800 : "transparent", border: "none" }}>
                  {f}
                </button>
              ))}
            </div>
            <Button variant="secondary" size="sm">Export CSV</Button>
          </div>
        </div>

        <Card padding={0}>
          <ScrollableTable>
            <div className="min-w-[800px]">
              <div className="grid grid-cols-[80px_140px_100px_200px_1fr_80px] gap-3 px-5 py-2 border-b border-g800 bg-g950">
                {["TIME", "ACTOR", "ACTION", "RESOURCE", "DETAIL", "LEVEL"].map(h => (
                  <span key={h} className="font-mono text-[10px] tracking-[0.1em] text-gray-600">{h}</span>
                ))}
              </div>
              {filtered.map((e, i) => (
                <div key={i} className="grid grid-cols-[80px_140px_100px_200px_1fr_80px] gap-3 px-5 py-2.5 items-center hover:bg-[var(--card-hover)] border-b border-g900">
              <span className="font-mono text-[10px] text-gray-600">{e.time}</span>
              <div>
                <span className="font-mono text-[10px] font-semibold text-white">{e.actor}</span>
                {e.role !== "agent" && <span className="font-mono text-[10px] text-gray-600 ml-1">({e.role})</span>}
              </div>
              <Badge color={ACTION_COLORS[e.action] || K.t3}>{e.action}</Badge>
              <span className="font-mono text-[10px] text-gray-400 overflow-hidden text-ellipsis whitespace-nowrap">{e.resource}</span>
              <span className="font-mono text-[10px] text-gray-500 overflow-hidden text-ellipsis whitespace-nowrap">{e.detail}</span>
              <Badge color={e.severity === "critical" ? K.danger : e.severity === "warn" ? K.warn : K.t3} dot pulse={e.severity === "critical"}>
                {e.severity.toUpperCase()}
              </Badge>
                </div>
              ))}
            </div>
          </ScrollableTable>
        </Card>
      </div>
    </DashboardLayout>
    </RoleGuard>
  );
}
