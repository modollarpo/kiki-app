"use client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { RoleGuard } from "@/components/layout/RoleGuard";
import { Card, Badge, Button, ScrollableTable } from "@/components/ui";
import { K } from "@/lib/kdls";
import { useInsights } from "@/hooks/useInsights";

interface AuditRow { source: string; action: string; details: string; time: string }

export default function AuditPage() {
  const { data, loading } = useInsights();
  const raw = (data?.audit ?? []) as AuditRow[];
  const EVENTS = raw.map(e => ({
    time: e.time ? new Date(e.time).toLocaleTimeString() : "—",
    source: e.source ?? "agent",
    action: e.action ?? "—",
    detail: e.details ?? "—",
  }));

  const exportCsv = () => {
    const esc = (v: string) => `"${String(v).replace(/"/g, '""')}"`;
    const csv = [
      ["time", "source", "action", "detail"].join(","),
      ...EVENTS.map(e => [e.time, e.source, e.action, e.detail].map(esc).join(",")),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <RoleGuard allowedRoles={["admin", "superadmin"]}>
      <DashboardLayout>
        <div className="max-w-[1400px] p-[clamp(14px,3vw,28px)]">
        <div className="flex flex-wrap justify-between items-start gap-3 mb-5">
          <div>
            <h1 className="font-mono font-bold text-lg text-t1 tracking-tight mb-1">Audit Log</h1>
            <p className="font-mono text-[11px] text-t3">Agent actions and notifications · {loading ? "…" : `${EVENTS.length} events`}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" onClick={exportCsv} disabled={EVENTS.length === 0}>Export CSV</Button>
          </div>
        </div>

        <Card padding={0}>
          {EVENTS.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <p className="font-mono text-[11px] text-t3">No audit events recorded yet.</p>
            </div>
          ) : (
            <ScrollableTable>
              <div className="min-w-[700px]">
                <div className="grid grid-cols-[80px_120px_160px_1fr] gap-3 px-5 py-2 border-b border-g800 bg-g950">
                  {["TIME", "SOURCE", "ACTION", "DETAIL"].map(h => (
                    <span key={h} className="font-mono text-[10px] tracking-[0.1em] text-t4">{h}</span>
                  ))}
                </div>
                {EVENTS.map((e, i) => (
                  <div key={i} className="grid grid-cols-[80px_120px_160px_1fr] gap-3 px-5 py-2.5 items-center hover:bg-[var(--card-hover)] border-b border-g900">
                    <span className="font-mono text-[10px] text-t4">{e.time}</span>
                    <Badge color={e.source === "agent" ? K.blue : K.teal}>{e.source}</Badge>
                    <span className="font-mono text-[10px] font-semibold text-t1 overflow-hidden text-ellipsis whitespace-nowrap">{e.action}</span>
                    <span className="font-mono text-[10px] text-t3 overflow-hidden text-ellipsis whitespace-nowrap">{e.detail}</span>
                  </div>
                ))}
              </div>
            </ScrollableTable>
          )}
        </Card>
      </div>
    </DashboardLayout>
    </RoleGuard>
  );
}
