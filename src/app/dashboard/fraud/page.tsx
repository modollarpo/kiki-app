"use client";
import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, Badge, ProgressBar, StatCard, EmptyState } from "@/components/ui";
import { useAuth } from "@/hooks/useAuth";
import { K } from "@/lib/kdls";

interface FraudStats {
  totalBlocked: number;
  totalDetected: number;
  estimatedSavings: number | null;
  blockRate: number | null;
  bySeverity: Record<string, number>;
}

const severityColor = (sev: string) =>
  sev === "critical" || sev === "high" ? K.danger : sev === "medium" ? K.warn : K.mint;

export default function FraudIVTPage() {
  const { token } = useAuth();
  const [stats, setStats] = useState<FraudStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    fetch("/api/fraud", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { setStats(d?.ok === false ? null : d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [token]);

  const severities = Object.entries(stats?.bySeverity || {});
  const severityTotal = severities.reduce((a, [, c]) => a + c, 0);

  return (
    <DashboardLayout>
      <div className="max-w-[1400px] p-[clamp(14px,3vw,28px)]">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-mono font-bold text-lg text-t1 tracking-tight mb-1">Fraud & IVT Detection</h1>
            <p className="font-mono text-caption text-t3">
              {loading ? <span className="inline-flex items-center gap-1.5"><span className="animate-spin w-3 h-3 border-2 border-t-transparent rounded-full shrink-0" style={{ borderColor: `${K.blue}40`, borderTopColor: K.blue }} /><span className="font-mono text-caption text-t3">Loading...</span></span> : `Invalid traffic monitoring · ${stats?.totalDetected || 0} events detected today`}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <StatCard label="Blocked Today" value={String(stats?.totalBlocked || 0)} accent={K.danger} sub="Events prevented" loading={loading} />
          <StatCard label="Detected Today" value={String(stats?.totalDetected || 0)} accent={K.warn} sub="Fraud/IVT events" loading={loading} />
          <StatCard label="Block Rate" value={stats?.blockRate != null ? `${stats.blockRate}%` : "—"} accent={K.mint} sub="Blocked / detected" loading={loading} />
          <StatCard label="Savings" value={stats?.estimatedSavings != null ? `$${stats.estimatedSavings.toLocaleString()}` : "—"} accent={K.gold} sub="Prevented wasted spend" loading={loading} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-3">
          <Card accent={K.danger}>
            <h3 className="font-mono font-bold text-small text-t1 mb-3.5">Detections by Severity</h3>
            {severities.length === 0 ? (
              <EmptyState icon="🛡️" title="No events detected" body="Your traffic is clean today." />
            ) : (
              severities.map(([sev, count]) => {
                const pct = severityTotal > 0 ? Math.round((count / severityTotal) * 100) : 0;
                return (
                  <div key={sev} className="py-2.5 border-b border-g800 last:border-0">
                    <div className="flex items-center justify-between mb-1.5">
                      <Badge color={severityColor(sev)} dot>{sev}</Badge>
                      <span className="font-mono text-sm font-bold text-t1">{count} <span className="font-mono text-caption text-t4">events</span></span>
                    </div>
                    <ProgressBar value={pct} color={severityColor(sev)} height={3} label={`${sev} severity share`} />
                  </div>
                );
              })
            )}
          </Card>

          <Card accent={K.gold}>
            <h3 className="font-mono font-bold text-small text-t1 mb-3.5">Impact</h3>
            <div className="p-4 rounded-sm mb-2.5 bg-g850">
              <p className="font-mono text-2xl font-bold text-kgold">{stats?.estimatedSavings != null ? `$${stats.estimatedSavings.toLocaleString()}` : "—"}</p>
              <p className="font-mono text-caption text-t3 mt-1">{stats?.estimatedSavings != null ? "Estimated savings today" : "Savings unavailable (no campaign CPA data)"}</p>
            </div>
            <div className="p-4 rounded-sm bg-g850">
              <p className="font-mono text-2xl font-bold text-kmint">{stats?.blockRate != null ? `${stats.blockRate}%` : "—"}</p>
              <p className="font-mono text-caption text-t3 mt-1">Block rate (blocked / detected)</p>
            </div>
            <div className="p-4 rounded-sm bg-g850 mt-2.5">
              <p className="font-mono text-2xl font-bold text-t1">{stats?.totalDetected || 0}</p>
              <p className="font-mono text-caption text-t3 mt-1">Total events detected today</p>
            </div>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
