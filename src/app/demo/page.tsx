"use client";

import { useState, useCallback } from "react";
import { MarketingLayout } from "@/components/layout/MarketingLayout";
import { K } from "@/lib/kdls";
import { Button } from "@/components/ui";

type Stage = { key: string; label: string; state: "pending" | "running" | "done" | "failed" };
type EnrichResult = {
  enriched: {
    predictedLtv90d: number;
    ltvConfidence: number;
    ltvSegment: string;
    valueToSend: number;
    enrichmentMethod: string;
    factors: string[];
    recommendedBidMultiplier: number;
  };
  dedupId: string;
  fraudScore: number;
  fraudBlocked: boolean;
  consentValid: boolean;
  latencyMs: number;
};

const STAGES: Stage[] = [
  { key: "intercept", label: "Conversion intercepted (server-side)", state: "pending" },
  { key: "fraud", label: "Fraud & consent check", state: "pending" },
  { key: "ltv", label: "28-feature vector + LTV prediction", state: "pending" },
  { key: "tier", label: "Tier classification & value mapping", state: "pending" },
  { key: "deliver", label: "Platform delivery", state: "pending" },
];

const SEGMENT_COLORS: Record<string, string> = { high: K.mint, mid: K.blue, low: K.gold, churn_risk: K.danger };

export default function DemoPage() {
  const [running, setRunning] = useState(false);
  const [stageStates, setStageStates] = useState<Stage["state"][]>(STAGES.map(() => "pending"));
  const [result, setResult] = useState<EnrichResult | null>(null);
  const [clientLatency, setClientLatency] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [orderValue, setOrderValue] = useState(149);

  const setStage = (i: number, state: Stage["state"]) =>
    setStageStates(prev => prev.map((s, idx) => (idx === i ? state : s)));

  const run = useCallback(async () => {
    setRunning(true);
    setError(null);
    setResult(null);
    setClientLatency(null);
    setStageStates(STAGES.map((_, i) => (i === 0 ? "done" : "running")));

    const started = performance.now();
    try {
      const res = await fetch("/api/capi/enrich", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          demo: true,
          event: {
            platform: "meta",
            eventName: "Purchase",
            eventTime: Math.floor(Date.now() / 1000),
            userData: {
              email: `demo.${Date.now()}@example.com`,
              externalId: `demo_${Date.now().toString(36)}`,
            },
            customData: {
              currency: "USD",
              value: orderValue,
              orderId: `ORD-DEMO-${Date.now().toString(36).toUpperCase()}`,
              productCategory: "apparel",
              contentName: "Demo Product",
            },
            consent: { gdpr: true, ccpa: true },
          },
        }),
      });
      const wall = Math.round(performance.now() - started);
      setClientLatency(wall);

      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || `Request failed (${res.status})`);
      }

      setStageStates(STAGES.map(() => "done"));
      setResult(json.data as EnrichResult);
    } catch (err) {
      setStageStates(prev => prev.map((s, i) => (s === "running" ? (i < 4 ? "done" : "failed") : s)));
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setRunning(false);
    }
  }, [orderValue]);

  const r = result;
  const seg = r ? SEGMENT_COLORS[r.enriched.ltvSegment] || K.t3 : K.t3;

  return (
    <MarketingLayout>
      <div className="min-h-screen flex flex-col items-center px-4 py-16" style={{ background: K.g950 }}>
        {/* Header */}
        <div className="text-center mb-10">
          <h1
            className="text-4xl md:text-5xl font-bold tracking-tight mb-4"
            style={{ color: K.t1, fontFamily: "var(--font-mono)" }}
          >
            KIKI Agent<span style={{ color: K.blue }}>™</span>
          </h1>
          <p className="text-lg" style={{ color: K.t2, fontFamily: "var(--font-sans)" }}>
            Run the real enrichment pipeline below, or watch the product demo.
          </p>
        </div>

        {/* Live enrichment demo */}
        <div
          className="w-full max-w-[1060px] rounded-2xl overflow-hidden mb-8"
          style={{
            border: `1px solid ${K.g750}`,
            boxShadow: `0 0 80px ${K.blue}15, 0 20px 60px rgba(0,0,0,0.6)`,
          }}
        >
          <div
            className="flex items-center justify-between gap-3 px-5 py-3 flex-wrap"
            style={{ background: K.g900, borderBottom: `1px solid ${K.g800}` }}
          >
            <span className="text-xs font-bold" style={{ color: K.mint, fontFamily: "var(--font-mono)" }}>
              LIVE ENRICHMENT
            </span>
            <span className="text-[10px]" style={{ color: K.t4, fontFamily: "var(--font-mono)" }}>
              real /api/capi/enrich pipeline · sample event · no account needed
            </span>
          </div>

          <div className="p-5 md:p-7" style={{ background: K.g950 }}>
            <div className="flex items-end gap-4 flex-wrap mb-6">
              <div>
                <label className="block text-[10px] mb-1.5" style={{ color: K.t4, fontFamily: "var(--font-mono)", letterSpacing: "0.1em" }}>
                  ORDER VALUE (USD)
                </label>
                <input
                  type="number"
                  min={1}
                  max={50000}
                  value={orderValue}
                  onChange={e => setOrderValue(Math.max(1, Math.min(50000, Number(e.target.value) || 1)))}
                  className="w-[140px] px-3 py-2 rounded-sm text-sm outline-none"
                  style={{ background: K.g900, border: `1px solid ${K.g700}`, color: K.t1, fontFamily: "var(--font-mono)" }}
                />
              </div>
              <Button variant="mint" size="md" onClick={run} disabled={running}>
                {running ? "Running…" : "Run enrichment →"}
              </Button>
              {clientLatency !== null && (
                <span className="text-[11px] pb-2" style={{ color: K.t3, fontFamily: "var(--font-mono)" }}>
                  end-to-end {clientLatency}ms
                  {r ? ` · pipeline ${r.latencyMs}ms (server)` : ""}
                </span>
              )}
            </div>

            {/* Stages */}
            <div className="mb-6">
              {STAGES.map((s, i) => {
                const state = stageStates[i];
                const color = state === "done" ? K.mint : state === "failed" ? K.danger : state === "running" ? K.blue : K.t4;
                return (
                  <div key={s.key} className="flex items-center gap-2.5 py-1.5">
                    <span
                      className={state === "running" ? "animate-kdls-pulse" : ""}
                      style={{ width: 7, height: 7, borderRadius: "50%", background: color, display: "inline-block", flexShrink: 0 }}
                    />
                    <span className="text-[12px]" style={{ color: state === "pending" ? K.t4 : K.t2, fontFamily: "var(--font-mono)" }}>
                      {s.label}
                    </span>
                  </div>
                );
              })}
            </div>

            {error && (
              <div className="p-4 rounded-sm text-[12px]" style={{ background: `${K.danger}14`, border: `1px solid ${K.danger}40`, color: K.t2, fontFamily: "var(--font-mono)" }}>
                Enrichment failed: {error}
              </div>
            )}

            {r && !error && (
              <div
                className="rounded-sm p-5"
                style={{ background: K.g900, border: `1px solid ${K.g800}` }}
              >
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  {[
                    { l: "ORDER VALUE", v: `$${orderValue.toFixed(2)}`, c: K.t1 },
                    { l: "PREDICTED 90-DAY LTV", v: `$${r.enriched.predictedLtv90d.toFixed(2)}`, c: K.mint },
                    { l: "CONFIDENCE", v: r.enriched.ltvConfidence.toFixed(2), c: K.blue },
                    { l: "SEGMENT", v: r.enriched.ltvSegment.toUpperCase(), c: seg },
                  ].map(x => (
                    <div key={x.l}>
                      <p className="text-[9px] mb-1" style={{ color: K.t4, fontFamily: "var(--font-mono)", letterSpacing: "0.1em" }}>{x.l}</p>
                      <p className="text-[17px] font-bold" style={{ color: x.c, fontFamily: "var(--font-mono)" }}>{x.v}</p>
                    </div>
                  ))}
                </div>

                <div className="text-[11px] leading-[1.9]" style={{ color: K.t3, fontFamily: "var(--font-mono)" }}>
                  <div>value sent to platforms&nbsp; → &nbsp;<span style={{ color: K.mint, fontWeight: 700 }}>${r.enriched.valueToSend.toFixed(2)}</span></div>
                  <div>enrichment method&nbsp;&nbsp;&nbsp;&nbsp; → &nbsp;<span style={{ color: K.t2 }}>{r.enriched.enrichmentMethod}</span></div>
                  <div>fraud score&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; → &nbsp;<span style={{ color: K.t2 }}>{r.fraudScore}</span> {r.fraudBlocked ? "(blocked)" : "(passed)"}</div>
                  <div>consent&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; → &nbsp;<span style={{ color: K.t2 }}>{r.consentValid ? "valid" : "blocked"}</span></div>
                  <div>dedup id&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; → &nbsp;<span style={{ color: K.t4 }}>{r.dedupId.slice(0, 24)}…</span></div>
                  <div>bid multiplier&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; → &nbsp;<span style={{ color: K.gold }}>{r.enriched.recommendedBidMultiplier.toFixed(2)}×</span></div>
                </div>

                <p className="mt-4 text-[10px]" style={{ color: K.t4, fontFamily: "var(--font-mono)" }}>
                  Demo tenant · platform delivery simulated — no live ad accounts are connected. Sign up to deliver enriched signals to Meta, Google, TikTok, and more.
                </p>
              </div>
            )}

            {!r && !error && !running && (
              <p className="text-[11px]" style={{ color: K.t4, fontFamily: "var(--font-mono)" }}>
                Run a sample $149 order through the pipeline to see it become an LTV signal.
              </p>
            )}
          </div>
        </div>

        {/* Video Player */}
        <div
          className="w-full max-w-[1060px] rounded-2xl overflow-hidden"
          style={{
            border: `1px solid ${K.g750}`,
            boxShadow: `0 0 80px ${K.blue}15, 0 20px 60px rgba(0,0,0,0.6)`,
          }}
        >
          {/* Chrome bar */}
          <div
            className="flex items-center gap-2 px-4 py-3"
            style={{ background: K.g900, borderBottom: `1px solid ${K.g800}` }}
          >
            <div className="flex gap-1.5">
              {[K.danger, K.warn, K.pos].map((c, i) => (
                <div key={i} style={{ width: 11, height: 11, borderRadius: "50%", background: c, opacity: 0.75 }} />
              ))}
            </div>
            <span className="flex-1 text-center text-xs" style={{ color: K.t3, fontFamily: "var(--font-mono)" }}>
              keekii.net &nbsp;·&nbsp; product demo
            </span>
          </div>

          {/* Video */}
          <video
            autoPlay
            loop
            muted
            playsInline
            controls
            className="w-full aspect-video"
            style={{ background: "#000" }}
          >
            <source src="/demo/kiki-demo.mp4" type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        </div>

        {/* CTA */}
        <div className="text-center mt-10">
          <a
            href="/auth/login"
            className="inline-block px-8 py-3 rounded-xl text-sm font-semibold tracking-wide transition-all"
            style={{
              background: K.blue,
              color: K.t1,
              boxShadow: `0 0 20px ${K.blue}40`,
            }}
          >
            START FREE TRIAL →
          </a>
          <p className="mt-4 text-xs" style={{ color: K.t3 }}>
            No credit card · 14-day trial · SOC 2 in progress · GDPR & CCPA
          </p>
        </div>
      </div>
    </MarketingLayout>
  );
}
