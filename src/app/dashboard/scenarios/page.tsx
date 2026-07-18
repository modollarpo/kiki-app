"use client";
import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatCard, Card, Badge, ProgressBar, Button } from "@/components/ui";
import { K, fmt } from "@/lib/kdls";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";

interface Scenario {
  id: string; name: string; description: string; budgetChange: number;
  projectedRevenue: number; projectedROAS: number; risk: string; confidence: number;
}

export default function ScenariosPage() {
  const { token } = useAuth();
  const router = useRouter();
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [selected, setSelected] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) { router.push("/auth/login"); return; }
    fetch("/api/scenarios", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setScenarios(d.data.scenarios);
          if (d.data.scenarios.length > 0) setSelected(d.data.scenarios[1]?.id || d.data.scenarios[0].id);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token, router]);

  const getRiskColor = (risk: string) => risk === "high" ? K.danger : risk === "medium" ? K.warn : K.mint;

  return (
    <DashboardLayout>
      <div className="max-w-[1400px] p-[clamp(14px,3vw,28px)]">
        <div className="mb-5">
          <h1 className="font-mono font-bold text-lg text-white tracking-tight mb-1">Scenario Planner</h1>
          <p className="font-mono text-[11px] text-gray-500">Budget allocation scenarios · Projected ROAS · Risk assessment</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <StatCard label="Scenarios" value={scenarios.length > 0 ? String(scenarios.length) : "—"} accent={K.blue} loading={loading} />
          <StatCard label="Best Projected ROAS" value={scenarios.length > 0 ? `${Math.max(...scenarios.map(s => s.projectedROAS))}×` : "—"} accent={K.mint} sub="Highest return" loading={loading} />
          <StatCard label="Avg Confidence" value={scenarios.length > 0 ? `${Math.round(scenarios.reduce((s, sc) => s + sc.confidence, 0) / scenarios.length)}%` : "—"} accent={K.teal} loading={loading} />
          <StatCard label="Total Projected Revenue" value={scenarios.length > 0 ? fmt.currency(scenarios.reduce((s, sc) => s + sc.projectedRevenue, 0)) : "—"} accent={K.gold} loading={loading} />
        </div>

        <div className="flex flex-col gap-3">
          {scenarios.map(sc => (
            <Card
              key={sc.id}
              accent={selected === sc.id ? K.blue : undefined}
              glow={selected === sc.id ? K.blue : undefined}
              hover
              onClick={() => setSelected(sc.id)}
              style={{ border: selected === sc.id ? `1px solid ${K.blue}60` : undefined }}
            >
              <div className="flex items-start gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="font-mono text-sm font-bold text-white">{sc.name}</span>
                    <Badge color={getRiskColor(sc.risk)}>{sc.risk.toUpperCase()} RISK</Badge>
                    <Badge color={K.t3}>{sc.confidence}% CONF</Badge>
                  </div>
                  <p className="font-mono text-[11px] text-gray-500 mb-3">{sc.description}</p>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-2">
                    <div>
                      <p className="font-mono text-[10px] text-gray-600 mb-0.5">BUDGET CHANGE</p>
                      <p className="font-mono text-[13px] font-bold" style={{ color: sc.budgetChange > 0 ? K.mint : sc.budgetChange < 0 ? K.danger : K.t2 }}>{sc.budgetChange > 0 ? "+" : ""}{sc.budgetChange}%</p>
                    </div>
                    <div>
                      <p className="font-mono text-[10px] text-gray-600 mb-0.5">PROJECTED ROAS</p>
                      <p className="font-mono text-[13px] font-bold text-kmint">{sc.projectedROAS}×</p>
                    </div>
                    <div>
                      <p className="font-mono text-[10px] text-gray-600 mb-0.5">PROJECTED REVENUE</p>
                      <p className="font-mono text-[13px] font-bold text-white">{fmt.currency(sc.projectedRevenue)}</p>
                    </div>
                    <div>
                      <p className="font-mono text-[10px] text-gray-600 mb-0.5">CONFIDENCE</p>
                      <p className="font-mono text-[13px] font-bold text-kblue">{sc.confidence}%</p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 flex-shrink-0">
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
