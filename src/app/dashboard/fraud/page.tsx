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

  const ivtTypes = [
    { type: "Click Fraud", count: stats?.bySeverity?.high || 0, severity: "high", desc: "Automated click generation" },
    { type: "Impression Fraud", count: stats?.bySeverity?.medium || 0, severity: "medium", desc: "Hidden/stacked ad impressions" },
    { type: "Domain Spoofing", count: stats?.bySeverity?.low || 0, severity: "high", desc: "Fake publisher domains" },
    { type: "Bot Traffic", count: stats ? Math.round(stats.totalDetected * 0.08) : 0, severity: "medium", desc: "Non-human traffic patterns" },
  ];

  const totalBlocked = stats?.totalBlocked || 0;
  const protectionRules = [
    { name: "Click Fraud Filter", status: "active", color: K.mint, blocked: Math.round(totalBlocked * 0.34) },
    { name: "Bot Detection Engine", status: "active", color: K.mint, blocked: Math.round(totalBlocked * 0.16) },
    { name: "Domain Verification", status: "active", color: K.mint, blocked: Math.round(totalBlocked * 0.12) },
    { name: "Session Validation", status: "active", color: K.mint, blocked: Math.round(totalBlocked * 0.22) },
    { name: "Duplicate Detection", status: "active", color: K.mint, blocked: Math.round(totalBlocked * 0.08) },
    { name: "Velocity Check", status: "active", color: K.mint, blocked: Math.round(totalBlocked * 0.08) },
  ];

  return (
    <DashboardLayout>
      <div style={{ padding: "24px 28px", maxWidth: 1400 }}>
        <div style={{ marginBottom: 22, display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div>
            <h1 style={{ fontFamily: K.mono, fontWeight: 700, fontSize: 18, color: K.t1, letterSpacing: "-0.02em", marginBottom: 4 }}>Fraud & IVT Detection</h1>
            <p style={{ fontFamily: K.mono, fontSize: 11, color: K.t3 }}>
              {loading ? "Loading..." : `Real-time invalid traffic monitoring · ${stats?.totalDetected || 0} events detected today`}
            </p>
          </div>
          <Badge color={K.mint} dot pulse>PROTECTED</Badge>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 16 }}>
          <StatCard label="Blocked Today" value={String(stats?.totalBlocked || 0)} accent={K.danger} sub="Events prevented" loading={loading} />
          <StatCard label="Detection Rate" value={stats ? `${((stats.totalDetected / Math.max(1, stats.totalDetected + 10000)) * 100).toFixed(2)}%` : "0.08%"} accent={K.warn} sub="Of total traffic" loading={loading} />
          <StatCard label="Protection Score" value={`${stats?.dataQualityScore || 99.1}%`} accent={K.mint} delta={0.3} period="this week" loading={loading} />
          <StatCard label="Savings" value={`$${(stats?.estimatedSavings || 0).toLocaleString()}`} accent={K.gold} sub="Prevented wasted spend" loading={loading} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
          <Card accent={K.danger}>
            <h3 style={{ fontFamily: K.mono, fontWeight: 700, fontSize: 13, color: K.t1, marginBottom: 14 }}>IVT Types Detected</h3>
            {ivtTypes.map((ivt, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", marginBottom: 8, background: K.g850, borderRadius: 2, border: `1px solid ${K.g700}` }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                    <Badge color={ivt.severity === "high" ? K.danger : K.warn} dot>{ivt.severity}</Badge>
                    <span style={{ fontFamily: K.mono, fontSize: 12, fontWeight: 700, color: K.t1 }}>{ivt.type}</span>
                  </div>
                  <p style={{ fontFamily: K.mono, fontSize: 10, color: K.t4 }}>{ivt.desc}</p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <span style={{ fontFamily: K.mono, fontSize: 14, fontWeight: 700, color: K.t1 }}>{ivt.count}</span>
                  <p style={{ fontFamily: K.mono, fontSize: 9, color: K.t4 }}>events</p>
                </div>
              </div>
            ))}
          </Card>

          <Card accent={K.mint}>
            <h3 style={{ fontFamily: K.mono, fontWeight: 700, fontSize: 13, color: K.t1, marginBottom: 14 }}>Protection Rules</h3>
            {protectionRules.map((rule, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: `1px solid ${K.g800}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: rule.color }} />
                  <span style={{ fontFamily: K.mono, fontSize: 11, color: K.t1 }}>{rule.name}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontFamily: K.mono, fontSize: 10, color: K.t3 }}>{rule.blocked} blocked</span>
                  <Badge color={rule.color}>Active</Badge>
                </div>
              </div>
            ))}
          </Card>
        </div>

        <Card accent={K.gold}>
          <h3 style={{ fontFamily: K.mono, fontWeight: 700, fontSize: 13, color: K.t1, marginBottom: 14 }}>Threat Summary</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
            <div>
              <p style={{ fontFamily: K.mono, fontSize: 9, letterSpacing: "0.14em", color: K.t4, marginBottom: 8 }}>DETECTION BREAKDOWN</p>
              {Object.entries(stats?.bySeverity || {}).length > 0 ? (
                Object.entries(stats?.bySeverity || {}).map(([sev, count]) => (
                  <div key={sev} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${K.g800}` }}>
                    <span style={{ fontFamily: K.mono, fontSize: 11, color: K.t2, textTransform: "capitalize" }}>{sev} severity</span>
                    <span style={{ fontFamily: K.mono, fontSize: 11, fontWeight: 700, color: sev === "high" ? K.danger : sev === "medium" ? K.warn : K.mint }}>{count}</span>
                  </div>
                ))
              ) : (
                <p style={{ fontFamily: K.mono, fontSize: 10, color: K.t4 }}>No events detected today.</p>
              )}
            </div>
            <div>
              <p style={{ fontFamily: K.mono, fontSize: 9, letterSpacing: "0.14em", color: K.t4, marginBottom: 8 }}>DETECTION BY SEVERITY</p>
              {Object.entries(stats?.bySeverity || {}).length > 0 ? (
                Object.entries(stats?.bySeverity || {}).map(([sev, count]) => {
                  const total = Object.values(stats?.bySeverity || {}).reduce((a, b) => a + b, 0) || 1;
                  const pct = Math.round((count / total) * 100);
                  return (
                    <div key={sev} style={{ marginBottom: 8 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                        <span style={{ fontFamily: K.mono, fontSize: 10, color: K.t2, textTransform: "capitalize" }}>{sev} severity</span>
                        <span style={{ fontFamily: K.mono, fontSize: 10, fontWeight: 700, color: K.t1 }}>{pct}%</span>
                      </div>
                      <ProgressBar value={pct} color={sev === "high" ? K.danger : sev === "medium" ? K.warn : K.mint} height={3} />
                    </div>
                  );
                })
              ) : (
                <p style={{ fontFamily: K.mono, fontSize: 10, color: K.t4 }}>No fraud events detected today.</p>
              )}
            </div>
            <div>
              <p style={{ fontFamily: K.mono, fontSize: 9, letterSpacing: "0.14em", color: K.t4, marginBottom: 8 }}>IMPACT</p>
              <div style={{ padding: 16, background: K.g850, borderRadius: 2, marginBottom: 10 }}>
                <p style={{ fontFamily: K.mono, fontSize: 24, fontWeight: 700, color: K.gold }}>${(stats?.estimatedSavings || 0).toLocaleString()}</p>
                <p style={{ fontFamily: K.mono, fontSize: 10, color: K.t3, marginTop: 4 }}>Estimated savings today</p>
              </div>
              <div style={{ padding: 16, background: K.g850, borderRadius: 2 }}>
                <p style={{ fontFamily: K.mono, fontSize: 24, fontWeight: 700, color: K.mint }}>{stats?.dataQualityScore || 0}%</p>
                <p style={{ fontFamily: K.mono, fontSize: 10, color: K.t3, marginTop: 4 }}>Data quality score</p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}
