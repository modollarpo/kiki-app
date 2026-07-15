"use client";
import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, Badge, StatCard } from "@/components/ui";
import { K } from "@/lib/kdls";

interface Insight { type: string; title: string; description: string; impact: string; confidence: number; }
interface Prediction { metric: string; value: string; confidence: number; range: string; }

export default function IntelligencePage() {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/intelligence")
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setInsights(d.data.insights);
          setPredictions(d.data.predictions);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const getInsightColor = (type: string) => type === "opportunity" ? K.mint : type === "alert" ? K.warn : K.blue;
  const getImpactColor = (impact: string) => impact === "high" ? K.mint : impact === "medium" ? K.gold : K.t3;

  return (
    <DashboardLayout>
      <div style={{ padding: "24px 28px", maxWidth: 1400, color: K.t1 }}>
        <div style={{ marginBottom: 22 }}>
          <h1 style={{ fontFamily: K.mono, fontWeight: 700, fontSize: 18, color: K.t1, letterSpacing: "-0.02em", marginBottom: 4 }}>AI Intelligence</h1>
          <p style={{ fontFamily: K.mono, fontSize: 11, color: K.t3 }}>AI-powered insights, predictions, and optimization recommendations</p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 16 }}>
          <StatCard label="Active Insights" value={insights.length > 0 ? String(insights.length) : "—"} accent={K.blue} sub="AI-generated" loading={loading} />
          <StatCard label="Avg Confidence" value={insights.length > 0 ? `${Math.round(insights.reduce((s, i) => s + i.confidence, 0) / insights.length)}%` : "—"} accent={K.mint} sub="Model accuracy" loading={loading} />
          <StatCard label="High Impact" value={insights.length > 0 ? String(insights.filter(i => i.impact === "high").length) : "—"} accent={K.gold} sub="Action needed" loading={loading} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 12, marginBottom: 16 }}>
          <Card accent={K.blue}>
            <h3 style={{ fontFamily: K.mono, fontWeight: 700, fontSize: 13, color: K.t1, marginBottom: 14 }}>AI Insights</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {insights.map((insight, i) => (
                <div key={i} style={{ padding: "14px", background: K.g850, borderRadius: 2, borderLeft: `3px solid ${getInsightColor(insight.type)}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <Badge color={getInsightColor(insight.type)}>{insight.type}</Badge>
                      <span style={{ fontFamily: K.mono, fontSize: 12, fontWeight: 600, color: K.t1 }}>{insight.title}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <Badge color={getImpactColor(insight.impact)}>{insight.impact} impact</Badge>
                      <span style={{ fontFamily: K.mono, fontSize: 10, color: K.t3 }}>{insight.confidence}% conf</span>
                    </div>
                  </div>
                  <p style={{ fontFamily: K.mono, fontSize: 11, color: K.t2, lineHeight: 1.5 }}>{insight.description}</p>
                </div>
              ))}
            </div>
          </Card>

          <Card accent={K.teal}>
            <h3 style={{ fontFamily: K.mono, fontWeight: 700, fontSize: 13, color: K.t1, marginBottom: 14 }}>Predictions</h3>
            {predictions.map((pred, i) => (
              <div key={i} style={{ padding: "14px", marginBottom: 8, background: K.g850, borderRadius: 2 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <span style={{ fontFamily: K.mono, fontSize: 11, color: K.t2 }}>{pred.metric}</span>
                  <span style={{ fontFamily: K.mono, fontSize: 10, color: K.t3 }}>{pred.confidence}% conf</span>
                </div>
                <p style={{ fontFamily: K.mono, fontSize: 18, fontWeight: 700, color: K.mint, marginBottom: 4 }}>{pred.value}</p>
                <p style={{ fontFamily: K.mono, fontSize: 10, color: K.t3 }}>Range: {pred.range}</p>
              </div>
            ))}
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
