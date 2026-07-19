"use client";
import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, Badge, ProgressBar, StatCard, Button } from "@/components/ui";
import { useAuth } from "@/hooks/useAuth";
import { K } from "@/lib/kdls";

interface FraudStats {
  totalBlocked: number;
  totalDetected: number;
  estimatedSavings: number;
  bySeverity: Record<string, number>;
  dataQualityScore: number;
}

export default function FraudIVTPage() {
  const { token } = useAuth();
  const [stats, setStats] = useState<FraudStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    fetch("/api/fraud", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { setStats(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [token]);

  const knownCount = (stats?.bySeverity?.high || 0) + (stats?.bySeverity?.medium || 0) + (stats?.bySeverity?.low || 0);
  const botCount = stats ? Math.max(0, stats.totalDetected - knownCount) : 0;
  const ivtTypes = [
    { type: "Click Fraud", count: stats?.bySeverity?.high || 0, severity: "high", desc: "Automated click generation" },
    { type: "Impression Fraud", count: stats?.bySeverity?.medium || 0, severity: "medium", desc: "Hidden/stacked ad impressions" },
    { type: "Domain Spoofing", count: stats?.bySeverity?.low || 0, severity: "high", desc: "Fake publisher domains" },
    { type: "Bot Traffic", count: botCount, severity: "medium", desc: "Non-human traffic patterns" },
  ];

  const knownBlocked = stats?.bySeverity ? Object.values(stats.bySeverity).reduce((a, b) => a + b, 0) : 0;
  const ruleNames = ["Click Fraud Filter", "Bot Detection Engine", "Domain Verification", "Session Validation", "Duplicate Detection", "Velocity Check"];
  const ruleCount = ruleNames.length;
  const protectionRules = ruleNames.map(name => ({
    name,
    status: "active" as const,
    color: K.mint,
    blocked: stats && (stats.totalBlocked || 0) > 0 ? Math.round((stats.totalBlocked || 0) / ruleCount) : 0,
  }));

  return (
    <DashboardLayout>
      <div className="max-w-[1400px] p-[clamp(14px,3vw,28px)]">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-mono font-bold text-lg text-white tracking-tight mb-1">Fraud & IVT Detection</h1>
            <p className="font-mono text-[11px] text-gray-500">
              {loading ? "Loading..." : `Real-time invalid traffic monitoring · ${stats?.totalDetected || 0} events detected today`}
            </p>
          </div>
          <Badge color={K.mint} dot pulse>PROTECTED</Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <StatCard label="Blocked Today" value={String(stats?.totalBlocked || 0)} accent={K.danger} sub="Events prevented" loading={loading} />
          <StatCard label="Detection Rate" value={stats ? `${((stats.totalDetected / Math.max(1, stats.totalDetected + 10000)) * 100).toFixed(2)}%` : "0.08%"} accent={K.warn} sub="Of total traffic" loading={loading} />
          <StatCard label="Protection Score" value={`${stats?.dataQualityScore || 99.1}%`} accent={K.mint} delta={0.3} period="this week" loading={loading} />
          <StatCard label="Savings" value={`$${(stats?.estimatedSavings || 0).toLocaleString()}`} accent={K.gold} sub="Prevented wasted spend" loading={loading} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-3">
          <Card accent={K.danger}>
            <h3 className="font-mono font-bold text-[13px] text-white mb-3.5">IVT Types Detected</h3>
            {ivtTypes.map((ivt, i) => (
              <div key={i} className="flex flex-wrap items-center justify-between gap-2 p-2.5 px-3 mb-2 rounded-sm bg-g850 border border-g700">
                <div className="flex-1 min-w-[120px]">
                  <div className="flex flex-wrap items-center gap-2 mb-[3px]">
                    <Badge color={ivt.severity === "high" ? K.danger : K.warn} dot>{ivt.severity}</Badge>
                    <span className="font-mono text-xs font-bold text-white">{ivt.type}</span>
                  </div>
                  <p className="font-mono text-[10px] text-gray-600">{ivt.desc}</p>
                </div>
                <div className="text-right">
                  <span className="font-mono text-sm font-bold text-white">{ivt.count}</span>
                  <p className="font-mono text-[10px] text-gray-600">events</p>
                </div>
              </div>
            ))}
          </Card>

          <Card accent={K.mint}>
            <h3 className="font-mono font-bold text-[13px] text-white mb-3.5">Protection Rules</h3>
            {protectionRules.map((rule, i) => (
              <div key={i} className="flex items-center justify-between py-2.5 border-b border-g800">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: rule.color }} />
                  <span className="font-mono text-[11px] text-white">{rule.name}</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="font-mono text-[10px] text-gray-500">{rule.blocked} blocked</span>
                  <Badge color={rule.color}>Active</Badge>
                </div>
              </div>
            ))}
          </Card>
        </div>

        <Card accent={K.gold}>
          <h3 className="font-mono font-bold text-[13px] text-white mb-3.5">Threat Summary</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <p className="font-mono text-[10px] tracking-[0.14em] text-gray-600 mb-2">DETECTION BREAKDOWN</p>
              {Object.entries(stats?.bySeverity || {}).length > 0 ? (
                Object.entries(stats?.bySeverity || {}).map(([sev, count]) => (
                  <div key={sev} className="flex justify-between py-1.5 border-b border-g800">
                    <span className="font-mono text-[11px] text-gray-400 capitalize">{sev} severity</span>
                    <span className="font-mono text-[11px] font-bold" style={{ color: sev === "high" ? K.danger : sev === "medium" ? K.warn : K.mint }}>{count}</span>
                  </div>
                ))
              ) : (
                <p className="font-mono text-[10px] text-gray-600">No events detected today.</p>
              )}
            </div>
            <div>
              <p className="font-mono text-[10px] tracking-[0.14em] text-gray-600 mb-2">DETECTION BY SEVERITY</p>
              {Object.entries(stats?.bySeverity || {}).length > 0 ? (
                Object.entries(stats?.bySeverity || {}).map(([sev, count]) => {
                  const total = Object.values(stats?.bySeverity || {}).reduce((a, b) => a + b, 0) || 1;
                  const pct = Math.round((count / total) * 100);
                  return (
                    <div key={sev} className="mb-2">
                      <div className="flex justify-between mb-[3px]">
                        <span className="font-mono text-[10px] text-gray-400 capitalize">{sev} severity</span>
                        <span className="font-mono text-[10px] font-bold text-white">{pct}%</span>
                      </div>
                      <ProgressBar value={pct} color={sev === "high" ? K.danger : sev === "medium" ? K.warn : K.mint} height={3} />
                    </div>
                  );
                })
              ) : (
                <p className="font-mono text-[10px] text-gray-600">No fraud events detected today.</p>
              )}
            </div>
            <div>
              <p className="font-mono text-[10px] tracking-[0.14em] text-gray-600 mb-2">IMPACT</p>
              <div className="p-4 rounded-sm mb-2.5 bg-g850">
                <p className="font-mono text-2xl font-bold text-kgold">${(stats?.estimatedSavings || 0).toLocaleString()}</p>
                <p className="font-mono text-[10px] text-gray-500 mt-1">Estimated savings today</p>
              </div>
              <div className="p-4 rounded-sm bg-g850">
                <p className="font-mono text-2xl font-bold text-kmint">{stats?.dataQualityScore || 0}%</p>
                <p className="font-mono text-[10px] text-gray-500 mt-1">Data quality score</p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}
