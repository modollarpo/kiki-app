"use client";
import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, Badge, Button, Input } from "@/components/ui";
import { K } from "@/lib/kdls";

const API_KEYS = [
  { name: "Production Key", key: "kiki_prod_sk_8f2a...x9k2", created: "Jun 12, 2026", lastUsed: "2 min ago", status: "active", calls: "142K" },
  { name: "Staging Key", key: "kiki_stg_sk_3b1c...m7p4", created: "May 28, 2026", lastUsed: "1 hour ago", status: "active", calls: "8.2K" },
  { name: "Legacy Key", key: "kiki_old_sk_9d4e...w2q1", created: "Jan 3, 2026", lastUsed: "45 days ago", status: "expired", calls: "312K" },
];

const WEBHOOKS = [
  { url: "https://app.kiki.ai/api/webhooks/incoming/slack", events: ["campaign.updated", "alert.fired"], status: "active" },
  { url: "https://app.kiki.ai/api/webhooks/incoming/custom", events: ["*"], status: "active" },
  { url: "https://app.kiki.ai/api/webhooks/incoming/zapier", events: ["report.completed"], status: "paused" },
];

const RATE_LIMITS = [
  { endpoint: "GET /v1/campaigns", limit: "1,000/min", used: "342/min", pct: 34.2 },
  { endpoint: "POST /v1/agents/run", limit: "200/min", used: "187/min", pct: 93.5 },
  { endpoint: "GET /v1/analytics", limit: "500/min", used: "89/min", pct: 17.8 },
  { endpoint: "POST /v1/creatives", limit: "100/min", used: "12/min", pct: 12 },
];

export default function DeveloperPage() {
  const [showKey, setShowKey] = useState<number | null>(null);

  return (
    <DashboardLayout>
      <div style={{ padding: "24px 28px", maxWidth: 1400 }}>
        <div style={{ marginBottom: 22 }}>
          <h1 style={{ fontFamily: K.mono, fontWeight: 700, fontSize: 18, color: K.t1, letterSpacing: "-0.02em", marginBottom: 4 }}>Developer Console</h1>
          <p style={{ fontFamily: K.mono, fontSize: 11, color: K.t3 }}>API keys · Webhooks · SDK version · Rate limits · Usage</p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 16 }}>
          {[{ label: "API Calls (24h)", value: "1.2M", color: K.blue }, { label: "Avg Latency", value: "42ms", color: K.mint }, { label: "Error Rate", value: "0.03%", color: K.teal }, { label: "SDK Version", value: "v3.8.2", color: K.gold }].map((s, i) => (
            <Card key={i} accent={s.color}>
              <p style={{ fontFamily: K.mono, fontSize: 9, letterSpacing: "0.14em", color: K.t4, marginBottom: 6 }}>{s.label}</p>
              <p style={{ fontFamily: K.mono, fontSize: 22, fontWeight: 700, color: s.color }}>{s.value}</p>
            </Card>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
          <Card padding={0}>
            <div style={{ padding: "14px 20px", borderBottom: `1px solid ${K.g800}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ fontFamily: K.mono, fontWeight: 700, fontSize: 13, color: K.t1, display: "flex", alignItems: "center", gap: 8 }}>API Keys <Badge color={K.t4} style={{ fontSize: 8 }}>SAMPLE</Badge></h2>
              <Button variant="secondary" size="sm">+ Generate Key</Button>
            </div>
            {API_KEYS.map((k, i) => (
              <div key={i} style={{ padding: "12px 20px", borderBottom: i < API_KEYS.length - 1 ? `1px solid ${K.g900}` : undefined }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                  <span style={{ fontFamily: K.mono, fontSize: 11, fontWeight: 600, color: K.t1 }}>{k.name}</span>
                  <Badge color={k.status === "active" ? K.mint : K.danger} dot pulse={k.status === "active"}>
                    {k.status.toUpperCase()}
                  </Badge>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <code style={{ fontFamily: K.mono, fontSize: 10, color: K.t3, background: K.g800, padding: "3px 8px", borderRadius: 2, flex: 1 }}>
                    {showKey === i ? k.key : k.key.replace(/./g, "•").slice(0, 24) + "..."}
                  </code>
                  <Button variant="ghost" size="xs" onClick={() => setShowKey(showKey === i ? null : i)}>
                    {showKey === i ? "Hide" : "Show"}
                  </Button>
                </div>
                <div style={{ display: "flex", gap: 16 }}>
                  <span style={{ fontFamily: K.mono, fontSize: 9, color: K.t4 }}>Created: {k.created}</span>
                  <span style={{ fontFamily: K.mono, fontSize: 9, color: K.t4 }}>Last used: {k.lastUsed}</span>
                  <span style={{ fontFamily: K.mono, fontSize: 9, color: K.t4 }}>Calls: {k.calls}</span>
                </div>
              </div>
            ))}
          </Card>

          <Card padding={0}>
            <div style={{ padding: "14px 20px", borderBottom: `1px solid ${K.g800}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ fontFamily: K.mono, fontWeight: 700, fontSize: 13, color: K.t1, display: "flex", alignItems: "center", gap: 8 }}>Webhooks <Badge color={K.t4} style={{ fontSize: 8 }}>SAMPLE</Badge></h2>
              <Button variant="secondary" size="sm">+ Add Endpoint</Button>
            </div>
            {WEBHOOKS.map((w, i) => (
              <div key={i} style={{ padding: "12px 20px", borderBottom: i < WEBHOOKS.length - 1 ? `1px solid ${K.g900}` : undefined }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                  <Badge color={w.status === "active" ? K.mint : K.t3} dot pulse={w.status === "active"}>{w.status.toUpperCase()}</Badge>
                </div>
                <code style={{ fontFamily: K.mono, fontSize: 9, color: K.t2, display: "block", marginBottom: 6, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{w.url}</code>
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                  {w.events.map((ev, j) => (
                    <Badge key={j} color={ev === "*" ? K.gold : K.blue} style={{ fontSize: 8 }}>{ev}</Badge>
                  ))}
                </div>
              </div>
            ))}
          </Card>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Card>
            <h2 style={{ fontFamily: K.mono, fontWeight: 700, fontSize: 13, color: K.t1, marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>Rate Limits <Badge color={K.t4} style={{ fontSize: 8 }}>SAMPLE</Badge></h2>
            {RATE_LIMITS.map((r, i) => (
              <div key={i} style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <code style={{ fontFamily: K.mono, fontSize: 10, color: K.t2 }}>{r.endpoint}</code>
                  <span style={{ fontFamily: K.mono, fontSize: 10, color: r.pct > 80 ? K.danger : K.t3 }}>{r.used} / {r.limit}</span>
                </div>
                <div style={{ background: K.g800, borderRadius: 2, height: 4, overflow: "hidden" }}>
                  <div style={{ width: `${r.pct}%`, height: "100%", background: r.pct > 80 ? K.danger : r.pct > 50 ? K.warn : K.blue, borderRadius: 2 }} />
                </div>
              </div>
            ))}
          </Card>

          <Card>
            <h2 style={{ fontFamily: K.mono, fontWeight: 700, fontSize: 13, color: K.t1, marginBottom: 14 }}>Sample API Call</h2>
            <div style={{ background: K.g950, border: `1px solid ${K.g800}`, borderRadius: 2, padding: 14, overflow: "auto" }}>
              <pre style={{ fontFamily: K.mono, fontSize: 10, color: K.t2, lineHeight: 1.7, margin: 0 }}>
{`curl -X GET "https://api.kiki.io/v1/campaigns" \\
  -H "Authorization: Bearer kiki_prod_sk_8f2a...x9k2" \\
  -H "Content-Type: application/json"

// Response
{
  "data": [{
    "id": "camp_q3_promo",
    "name": "Q3 Summer Campaign",
    "status": "active",
    "roas": 4.82,
    "budget": 5000,
    "spend": 3240
  }],
  "meta": { "total": 5, "page": 1 }
}`}
              </pre>
            </div>
            <div style={{ marginTop: 10, display: "flex", gap: 6 }}>
              <Button variant="secondary" size="xs" onClick={() => {
                const curlCmd = 'curl -X GET "https://app.kiki.ai/api/v1/campaigns" -H "Authorization: Bearer kiki_prod_sk_8f2a...x9k2" -H "Content-Type: application/json"';
                navigator.clipboard.writeText(curlCmd).catch(() => {});
              }}>Copy cURL</Button>
              <Button variant="ghost" size="xs" onClick={() => window.open("/docs", "_blank")}>View Full Docs →</Button>
            </div>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
