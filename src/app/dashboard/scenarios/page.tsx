"use client";
import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatCard, Card, Badge, ProgressBar, Button } from "@/components/ui";
import { K, fmt } from "@/lib/kdls";

interface Scenario {
  id: string; name: string; description: string; budgetChange: number;
  projectedRevenue: number; projectedROAS: number; risk: string; confidence: number;
}

export default function ScenariosPage() {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [selected, setSelected] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/scenarios")
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setScenarios(d.data.scenarios);
          if (d.data.scenarios.length > 0) setSelected(d.data.scenarios[1]?.id || d.data.scenarios[0].id);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const getRiskColor = (risk: string) => risk === "high" ? K.danger : risk === "medium" ? K.warn : K.mint;

  return (
    <DashboardLayout>
      <div style={{ padding: "24px 28px", maxWidth: 1400 }}>
        <div style={{ marginBottom: 22 }}>
          <h1 style={{ fontFamily: K.mono, fontWeight: 700, fontSize: 18, color: K.t1, letterSpacing: "-0.02em", marginBottom: 4 }}>Scenario Planner</h1>
          <p style={{ fontFamily: K.mono, fontSize: 11, color: K.t3 }}>Budget allocation scenarios · Projected ROAS · Risk assessment</p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 16 }}>
          <StatCard label="Scenarios" value={scenarios.length > 0 ? String(scenarios.length) : "—"} accent={K.blue} loading={loading} />
          <StatCard label="Best Projected ROAS" value={scenarios.length > 0 ? `${Math.max(...scenarios.map(s => s.projectedROAS))}×` : "—"} accent={K.mint} sub="Highest return" loading={loading} />
          <StatCard label="Avg Confidence" value={scenarios.length > 0 ? `${Math.round(scenarios.reduce((s, sc) => s + sc.confidence, 0) / scenarios.length)}%` : "—"} accent={K.teal} loading={loading} />
          <StatCard label="Total Projected Revenue" value={scenarios.length > 0 ? fmt.currency(scenarios.reduce((s, sc) => s + sc.projectedRevenue, 0)) : "—"} accent={K.gold} loading={loading} />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {scenarios.map(sc => (
            <Card
              key={sc.id}
              accent={selected === sc.id ? K.blue : undefined}
              glow={selected === sc.id ? K.blue : undefined}
              hover
              onClick={() => setSelected(sc.id)}
              style={{ border: selected === sc.id ? `1px solid ${K.blue}60` : undefined }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <span style={{ fontFamily: K.mono, fontSize: 14, fontWeight: 700, color: K.t1 }}>{sc.name}</span>
                    <Badge color={getRiskColor(sc.risk)}>{sc.risk.toUpperCase()} RISK</Badge>
                    <Badge color={K.t3}>{sc.confidence}% CONF</Badge>
                  </div>
                  <p style={{ fontFamily: K.mono, fontSize: 11, color: K.t3, marginBottom: 12 }}>{sc.description}</p>

                  <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
                    <div>
                      <p style={{ fontFamily: K.mono, fontSize: 9, color: K.t4, marginBottom: 2 }}>BUDGET CHANGE</p>
                      <p style={{ fontFamily: K.mono, fontSize: 13, fontWeight: 700, color: sc.budgetChange > 0 ? K.mint : sc.budgetChange < 0 ? K.danger : K.t2 }}>{sc.budgetChange > 0 ? "+" : ""}{sc.budgetChange}%</p>
                    </div>
                    <div>
                      <p style={{ fontFamily: K.mono, fontSize: 9, color: K.t4, marginBottom: 2 }}>PROJECTED ROAS</p>
                      <p style={{ fontFamily: K.mono, fontSize: 13, fontWeight: 700, color: K.mint }}>{sc.projectedROAS}×</p>
                    </div>
                    <div>
                      <p style={{ fontFamily: K.mono, fontSize: 9, color: K.t4, marginBottom: 2 }}>PROJECTED REVENUE</p>
                      <p style={{ fontFamily: K.mono, fontSize: 13, fontWeight: 700, color: K.t1 }}>{fmt.currency(sc.projectedRevenue)}</p>
                    </div>
                    <div>
                      <p style={{ fontFamily: K.mono, fontSize: 9, color: K.t4, marginBottom: 2 }}>CONFIDENCE</p>
                      <p style={{ fontFamily: K.mono, fontSize: 13, fontWeight: 700, color: K.blue }}>{sc.confidence}%</p>
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 6, flexShrink: 0 }}>
                  {selected === sc.id && <Button variant="primary" size="sm">Selected</Button>}
                  {selected !== sc.id && <Button variant="secondary" size="sm">Select</Button>}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
