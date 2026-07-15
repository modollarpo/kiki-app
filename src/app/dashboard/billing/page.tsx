"use client";
import { useState, useEffect, useCallback } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, Badge, ProgressBar, Button, AIThinking } from "@/components/ui";
import { useAuth } from "@/hooks/useAuth";
import { K, fmt } from "@/lib/kdls";

interface BillingData {
  subscription: {
    plan: string;
    status: string;
    currentPeriodEnd: string;
  } | null;
  usage: Record<string, { quantity: number; cost: number }>;
  totalManagedSpend: number;
  oaas: { totalFees: number; platformFeeRate: number } | null;
}

export default function BillingPage() {
  const { token } = useAuth();
  const [tab, setTab] = useState<"overview" | "invoices">("overview");
  const [billing, setBilling] = useState<BillingData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchBilling = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch("/api/billing", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setBilling(data.data || data);
      }
    } catch {
      // keep existing
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchBilling();
  }, [fetchBilling]);

  const plan = billing?.subscription;
  const usage = billing?.usage || {};
  const totalSpend = billing?.totalManagedSpend || 0;
  const oaas = billing?.oaas;

  const meters = [
    { name: "API Calls", used: usage.api_calls?.quantity || 0, limit: 500000, unit: "calls" },
    { name: "AI Agent Runs", used: usage.ai_agent_runs?.quantity || 0, limit: 2000, unit: "runs" },
    { name: "Storage", used: usage.storage?.quantity || 0, limit: 50, unit: "GB" },
    { name: "Team Seats", used: usage.team_seats?.quantity || 0, limit: 10, unit: "seats" },
    { name: "Webhooks", used: usage.webhooks?.quantity || 0, limit: 20, unit: "endpoints" },
  ];

  return (
    <DashboardLayout>
      <div style={{ padding: "24px 28px", maxWidth: 1400 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 22 }}>
          <div>
            <h1 style={{ fontFamily: K.mono, fontWeight: 700, fontSize: 18, color: K.t1, letterSpacing: "-0.02em", marginBottom: 4 }}>Billing & Plans</h1>
            <p style={{ fontFamily: K.mono, fontSize: 11, color: K.t3 }}>Current plan · Usage meters · Invoice history</p>
          </div>
          <div style={{ display: "flex", gap: 4, background: K.g900, border: `1px solid ${K.g800}`, borderRadius: 2, padding: 3 }}>
            {(["overview", "invoices"] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                style={{ padding: "5px 14px", fontFamily: K.mono, fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", color: tab === t ? K.t1 : K.t4, background: tab === t ? K.g800 : "transparent", border: "none", borderRadius: 2, cursor: "pointer" }}>
                {t.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: 60 }}>
            <AIThinking text="Loading billing data..." />
          </div>
        ) : tab === "overview" ? (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 16 }}>
              <Card accent={K.gold} glow={K.gold}>
                <p style={{ fontFamily: K.mono, fontSize: 9, letterSpacing: "0.14em", color: K.t4, marginBottom: 8 }}>CURRENT PLAN</p>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <span style={{ fontFamily: K.mono, fontSize: 22, fontWeight: 700, color: K.gold }}>{plan?.plan?.toUpperCase() || "FREE"}</span>
                  <Badge color={plan?.status === "active" ? K.mint : K.warn}>{plan?.status?.toUpperCase() || "NONE"}</Badge>
                </div>
                <p style={{ fontFamily: K.mono, fontSize: 10, color: K.t3, marginTop: 4 }}>
                  {plan?.currentPeriodEnd ? `Renews ${new Date(plan.currentPeriodEnd).toLocaleDateString()}` : "No active subscription"}
                </p>
              </Card>

              <Card>
                <p style={{ fontFamily: K.mono, fontSize: 9, letterSpacing: "0.14em", color: K.t4, marginBottom: 8 }}>TOTAL MANAGED SPEND</p>
                <p style={{ fontFamily: K.mono, fontSize: 28, fontWeight: 700, color: K.t1, marginBottom: 4 }}>${fmt.compact(totalSpend)}</p>
                <p style={{ fontFamily: K.mono, fontSize: 10, color: K.t3, marginBottom: 12 }}>Across all campaigns</p>
              </Card>

              <Card>
                <p style={{ fontFamily: K.mono, fontSize: 9, letterSpacing: "0.14em", color: K.t4, marginBottom: 8 }}>OaaS FEES</p>
                <p style={{ fontFamily: K.mono, fontSize: 28, fontWeight: 700, color: K.mint, marginBottom: 4 }}>
                  {oaas ? `$${oaas.totalFees.toFixed(2)}` : "N/A"}
                </p>
                <p style={{ fontFamily: K.mono, fontSize: 10, color: K.t3, marginBottom: 12 }}>
                  {oaas ? `${(oaas.platformFeeRate * 100).toFixed(1)}% platform fee` : "Not on OaaS plan"}
                </p>
              </Card>
            </div>

            <Card>
              <div style={{ padding: "14px 20px", borderBottom: `1px solid ${K.g800}` }}>
                <h2 style={{ fontFamily: K.mono, fontWeight: 700, fontSize: 13, color: K.t1 }}>Usage Meters</h2>
              </div>
              {meters.map((m, i) => {
                const pct = m.limit > 0 ? (m.used / m.limit) * 100 : 0;
                const warn = pct > 80;
                return (
                  <div key={i} style={{ padding: "12px 20px", borderBottom: i < meters.length - 1 ? `1px solid ${K.g900}` : undefined }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <span style={{ fontFamily: K.mono, fontSize: 11, fontWeight: 600, color: K.t1 }}>{m.name}</span>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontFamily: K.mono, fontSize: 11, color: warn ? K.warn : K.t2 }}>
                          {m.used >= 1000 ? fmt.compact(m.used) : m.used} / {m.limit >= 1000 ? fmt.compact(m.limit) : m.limit} {m.unit}
                        </span>
                        {warn && <Badge color={K.warn}>HIGH</Badge>}
                      </div>
                    </div>
                    <ProgressBar value={pct} color={warn ? K.warn : K.blue} height={4} glow={warn} />
                  </div>
                );
              })}
            </Card>
          </>
        ) : (
          <Card padding={0}>
            <div style={{ padding: "14px 20px", borderBottom: `1px solid ${K.g800}` }}>
              <h2 style={{ fontFamily: K.mono, fontWeight: 700, fontSize: 13, color: K.t1 }}>Invoice History</h2>
            </div>
            <div style={{ padding: 40, textAlign: "center" }}>
              <p style={{ fontFamily: K.mono, fontSize: 12, color: K.t4 }}>Invoices are generated automatically. Download from the Reports page.</p>
            </div>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
