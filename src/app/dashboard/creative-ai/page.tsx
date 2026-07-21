"use client";
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, StatCard, Badge, Button, ScrollableTable } from "@/components/ui";
import { K } from "@/lib/kdls";

interface CopyVariation {
  id: string;
  headline: string;
  primaryText: string;
  callToAction: string;
  platform: string;
  characterCount: number;
}

interface GeneratedCreative {
  id: string;
  campaignId: string;
  platform: string;
  type: string;
  copies: CopyVariation[];
  imagePrompt?: string;
  status: string;
  createdAt: number;
}

interface FatiguedCampaign {
  campaignId: string;
  campaignName: string;
  platform: string;
  currentRoas: number;
  targetRoas: number;
  consecutiveLowRoasDays: number;
}

interface CreativeData {
  fatigued: FatiguedCampaign[];
  creatives: GeneratedCreative[];
  counts: { fatigued: number; creatives: number };
}

const PLATFORM_COLORS: Record<string, string> = {
  meta: "#3b82f6",
  google: "#ef4444",
  tiktok: "#f0f0f0",
  snap: "#f59e0b",
  pinterest: "#ef4444",
  linkedin: "#3b82f6",
  all: "#10b981",
};

export default function CreativeAIPage() {
  const { token, loading: authLoading } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<CreativeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedCreative, setSelectedCreative] = useState<GeneratedCreative | null>(null);
  const [lastRun, setLastRun] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !token) router.push("/auth/login");
  }, [token, authLoading, router]);

  const fetchData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch("/api/creative/generate", { headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json() as CreativeData & { ok: boolean };
      if (json.ok) setData(json);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleGenerate = async () => {
    if (!token) return;
    setGenerating(true);
    try {
      const res = await fetch("/api/creative/generate", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json() as { ok: boolean; generated: number; fatigued: number };
      if (json.ok) {
        setLastRun(`Generated ${json.generated} creative bundle(s) for ${json.fatigued} fatigued campaign(s)`);
        await fetchData();
      }
    } finally {
      setGenerating(false);
    }
  };

  return (
    <DashboardLayout>
      <div style={{ maxWidth: 1400, padding: "clamp(14px,3vw,28px)" }}>
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="font-mono font-bold text-[clamp(16px,2.5vw,20px)] tracking-tight mb-1" style={{ color: K.t1 }}>
              Creative AI Engine
            </h1>
            <p className="font-mono text-[11px]" style={{ color: K.t3 }}>
              Auto-generate cross-platform ad copy · Detect creative fatigue · Deploy to all 6 ad networks
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={handleGenerate}
              disabled={generating}
              style={{ background: K.mint, color: "#000", border: "none", opacity: generating ? 0.6 : 1 }}
            >
              {generating ? "⚡ Generating..." : "✦ Run Creative AI"}
            </Button>
          </div>
        </div>

        {lastRun && (
          <div className="mb-4 px-4 py-3 rounded font-mono text-[11px]" style={{ background: K.g850, border: `1px solid ${K.mint}`, color: K.mint }}>
            ✅ {lastRun}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard label="Fatigued Campaigns" value={loading ? "…" : String(data?.counts.fatigued ?? 0)} accent={K.warn} />
          <StatCard label="Creatives Generated" value={loading ? "…" : String(data?.counts.creatives ?? 0)} accent={K.mint} />
          <StatCard label="Platforms Covered" value="6" accent={K.blue} />
          <StatCard label="AI Model" value="GPT-4o" accent={K.teal} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Fatigued Campaigns */}
          <Card padding={0}>
            <div className="px-5 py-4 border-b" style={{ borderColor: K.cardBorder }}>
              <h2 className="font-mono font-bold text-[13px]" style={{ color: K.t1 }}>
                🔴 Fatigued Campaigns
              </h2>
              <p className="font-mono text-[10px] mt-1" style={{ color: K.t3 }}>ROAS below 60% of target for 3+ days</p>
            </div>
            {loading ? (
              <div className="px-5 py-8 text-center font-mono text-[11px]" style={{ color: K.t3 }}>Loading…</div>
            ) : !data?.fatigued.length ? (
              <div className="px-5 py-8 text-center font-mono text-[11px]" style={{ color: K.t3 }}>
                ✅ No fatigued campaigns detected
              </div>
            ) : (
              <div>
                {data.fatigued.map(c => (
                  <div key={c.campaignId} className="px-5 py-3 border-b flex items-center justify-between gap-3" style={{ borderColor: K.g900 }}>
                    <div>
                      <p className="font-mono text-[12px] font-semibold" style={{ color: K.t1 }}>{c.campaignName}</p>
                      <p className="font-mono text-[10px]" style={{ color: K.t3 }}>
                        ROAS {c.currentRoas.toFixed(2)}× / target {c.targetRoas.toFixed(1)}× · {c.consecutiveLowRoasDays}d low
                      </p>
                    </div>
                    <Badge color={PLATFORM_COLORS[c.platform] ?? K.blue}>{c.platform.toUpperCase()}</Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Platform Coverage */}
          <Card>
            <h2 className="font-mono font-bold text-[13px] mb-4" style={{ color: K.t1 }}>✦ Platform Creative Specs</h2>
            <div className="space-y-2">
              {[
                { platform: "Meta", spec: "1:1 / 4:5 / 9:16 · 125 char text · 40 char headline", color: "#3b82f6" },
                { platform: "Google", spec: "Responsive display · 30 char headline · 90 char desc", color: "#ef4444" },
                { platform: "TikTok", spec: "9:16 vertical video · 100 char text · 50 char hook", color: "#f0f0f0" },
                { platform: "Snap", spec: "9:16 full-screen · 90 char caption · 34 char brand", color: "#f59e0b" },
                { platform: "Pinterest", spec: "2:3 vertical · 100 char title · 500 char desc", color: "#bd1e2d" },
                { platform: "LinkedIn", spec: "1.91:1 · 70 char headline · 150 char intro", color: "#0a66c2" },
              ].map(p => (
                <div key={p.platform} className="flex items-start gap-3 py-2 border-b" style={{ borderColor: K.g900 }}>
                  <span className="font-mono text-[10px] font-bold shrink-0 w-16" style={{ color: p.color }}>{p.platform}</span>
                  <span className="font-mono text-[10px]" style={{ color: K.t3 }}>{p.spec}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Generated Creatives */}
        <Card padding={0}>
          <div className="px-5 py-4 border-b" style={{ borderColor: K.cardBorder }}>
            <h2 className="font-mono font-bold text-[13px]" style={{ color: K.t1 }}>Generated Creative Bundles</h2>
          </div>
          {loading ? (
            <div className="px-5 py-8 text-center font-mono text-[11px]" style={{ color: K.t3 }}>Loading…</div>
          ) : !data?.creatives.length ? (
            <div className="px-5 py-12 text-center">
              <p className="font-mono text-[13px] mb-2" style={{ color: K.t2 }}>No creatives generated yet</p>
              <p className="font-mono text-[10px]" style={{ color: K.t3 }}>
                Click "Run Creative AI" to detect fatigued campaigns and auto-generate fresh ad copy
              </p>
            </div>
          ) : (
            <ScrollableTable>
              <div style={{ minWidth: 700 }}>
                <div className="grid gap-3 px-5 py-2 border-b" style={{ gridTemplateColumns: "1fr 80px 120px 80px", borderColor: K.g900, background: K.g950 }}>
                  {["CAMPAIGN", "TYPE", "PLATFORMS", "STATUS"].map(h => (
                    <span key={h} className="font-mono text-[10px] tracking-widest" style={{ color: K.t3 }}>{h}</span>
                  ))}
                </div>
                {data.creatives.map(c => (
                  <div
                    key={c.id}
                    className="grid gap-3 px-5 py-3 border-b cursor-pointer"
                    style={{ gridTemplateColumns: "1fr 80px 120px 80px", borderColor: K.g900, background: selectedCreative?.id === c.id ? K.cardHover : "transparent" }}
                    onClick={() => setSelectedCreative(selectedCreative?.id === c.id ? null : c)}
                  >
                    <span className="font-mono text-[11px]" style={{ color: K.t1 }}>{c.campaignId}</span>
                    <Badge color={K.teal}>{c.type}</Badge>
                    <span className="font-mono text-[10px]" style={{ color: K.t3 }}>{c.copies.length} variations</span>
                    <Badge color={c.status === "deployed" ? K.mint : c.status === "rejected" ? K.danger : K.gold}>{c.status}</Badge>
                  </div>
                ))}
              </div>
            </ScrollableTable>
          )}
        </Card>

        {/* Creative Preview */}
        {selectedCreative && (
          <Card style={{ marginTop: 24 }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-mono font-bold text-[13px]" style={{ color: K.t1 }}>✦ Copy Variations Preview</h2>
              <button onClick={() => setSelectedCreative(null)} className="font-mono text-[10px]" style={{ color: K.t3 }}>✕ Close</button>
            </div>
            {selectedCreative.imagePrompt && (
              <div className="mb-4 px-4 py-3 rounded text-[10px] font-mono" style={{ background: K.g950, border: `1px solid ${K.cardBorder}`, color: K.t3 }}>
                🎨 <strong style={{ color: K.t2 }}>Image Prompt:</strong> {selectedCreative.imagePrompt}
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {selectedCreative.copies.map(copy => (
                <div key={copy.id} className="p-4 rounded" style={{ background: K.g900, border: `1px solid ${K.cardBorder}` }}>
                  <div className="flex items-center justify-between mb-2">
                    <Badge color={PLATFORM_COLORS[copy.platform] ?? K.blue}>{copy.platform.toUpperCase()}</Badge>
                    <span className="font-mono text-[9px]" style={{ color: K.t3 }}>{copy.characterCount} chars</span>
                  </div>
                  <p className="font-mono text-[11px] font-bold mb-1" style={{ color: K.t1 }}>{copy.headline}</p>
                  <p className="font-mono text-[10px] mb-2" style={{ color: K.t2 }}>{copy.primaryText}</p>
                  <span className="font-mono text-[9px] px-2 py-1 rounded" style={{ background: K.mint + "22", color: K.mint, border: `1px solid ${K.mint}44` }}>
                    {copy.callToAction}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}

