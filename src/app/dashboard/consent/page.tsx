"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, ProgressBar, StatCard } from "@/components/ui";
import { K } from "@/lib/kdls";
import { useAuth } from "@/hooks/useAuth";

interface ConsentData {
  totalUsers: number;
  byPlan: { plan: string; count: number }[];
  consent: {
    optIn: number;
    optOut: number;
    withdraw: number;
    updatePreferences: number;
    dataRequest: number;
    dataDeletion: number;
    total: number;
    lastActionAt: string | null;
  };
}

export default function ConsentPrivacyPage() {
  const { token, loading: authLoading } = useAuth();
  const router = useRouter();
  const [consentData, setConsentData] = useState<ConsentData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !token) router.push("/auth/login");
  }, [token, authLoading, router]);

  useEffect(() => {
    if (!token) return;
    fetch("/api/consent", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.data) setConsentData(d.data);
      })
      .catch((err) => { setError(err?.message || "Failed to load consent data"); setLoading(false); })
      .finally(() => setLoading(false));
  }, [token]);

  const totalUsers = consentData?.totalUsers ?? 0;
  const byPlan = consentData?.byPlan ?? [];
  const consent = consentData?.consent;

  const decideTotal = (consent?.optIn ?? 0) + (consent?.optOut ?? 0);
  const optInRate = decideTotal > 0 ? Math.round(((consent?.optIn ?? 0) / decideTotal) * 1000) / 10 : null;

  const consentActions = consent
    ? [
        { label: "Opt-ins", value: consent.optIn, color: K.mint },
        { label: "Opt-outs", value: consent.optOut, color: K.danger },
        { label: "Withdrawals", value: consent.withdraw, color: K.warn },
        { label: "Preference updates", value: consent.updatePreferences, color: K.blue },
        { label: "Data requests", value: consent.dataRequest, color: K.teal },
        { label: "Deletion requests", value: consent.dataDeletion, color: K.gold },
      ]
    : [];

  if (authLoading) return <DashboardLayout><div style={{color:"var(--t2)",padding:"2rem"}}>Loading...</div></DashboardLayout>;
  if (!token) return null;

  return (
    <DashboardLayout>
      <div className="space-y-6 text-t1 p-[clamp(14px,3vw,28px)] max-w-[1400px]">
        <div>
          <h1 className="text-2xl font-semibold text-t1">Consent & Privacy</h1>
          <p className="mt-1 text-sm text-t3">Manage user consent, privacy compliance, and data protection</p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-sm" style={{ background: `${K.danger}12`, border: `1px solid ${K.danger}40` }}>
            <p className="font-mono text-[11px]" style={{ color: K.danger }}>{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Opt-In Rate" value={loading ? "…" : optInRate != null ? `${optInRate}%` : "—"} sub={decideTotal > 0 ? `${decideTotal} opt-in/out decisions` : "No opt-in/out decisions yet"} accent={K.mint} />
          <StatCard label="Consent Actions" value={loading ? "…" : consent ? String(consent.total) : "—"} sub={consent?.lastActionAt ? `Last: ${new Date(consent.lastActionAt).toLocaleDateString()}` : "No actions recorded"} accent={K.blue} />
          <StatCard label="Total Users" value={loading ? "…" : totalUsers > 0 ? totalUsers.toLocaleString() : "—"} sub="In this tenant" accent={K.gold} />
          <StatCard label="Opt-Outs" value={loading ? "…" : consent ? String(consent.optOut) : "—"} sub="Users who declined" accent={K.danger} />
        </div>

        <Card className="p-4 bg-g950 border-g850">
          <h3 className="text-sm font-semibold mb-3 text-t1">Users by Plan</h3>
          <div className="space-y-3">
            {byPlan.length > 0 ? byPlan.map((plan, i) => {
              const share = totalUsers > 0 ? (plan.count / totalUsers) * 100 : 0;
              return (
                <div key={i} className="flex items-center gap-4 p-3 rounded-lg bg-g900">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-t1 capitalize">{plan.plan || "unknown"}</span>
                      <span className="text-sm font-semibold text-t1">{plan.count.toLocaleString()}</span>
                    </div>
                    <ProgressBar value={share} max={100} color={K.blue} height={4} />
                  </div>
                  <div className="text-right w-24">
                    <div className="text-xs text-t3">Share</div>
                    <div className="text-sm font-medium text-t2">{share.toFixed(1)}%</div>
                  </div>
                </div>
              );
            }) : (
              <p className="font-mono text-[11px] text-t3 py-4 text-center">No user data yet.</p>
            )}
          </div>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="p-4 bg-g950 border-g850">
            <h3 className="text-sm font-semibold mb-3 text-t1">Consent Action Log</h3>
            <div className="space-y-3">
              {consent && consent.total > 0 ? consentActions.map((a, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-sm text-t2">{a.label}</span>
                  <span className="text-sm font-semibold" style={{ color: a.color }}>{a.value.toLocaleString()}</span>
                </div>
              )) : (
                <p className="font-mono text-[11px] text-t3 py-4 text-center">No consent actions recorded yet. Consent events will appear here as they are captured.</p>
              )}
            </div>
          </Card>

          <Card className="p-4 bg-g950 border-g850">
            <h3 className="text-sm font-semibold mb-3 text-t1">UID2 Adoption Status</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-t2">Hashed Email Match Rate</span>
                <span className="text-sm font-semibold text-kmint">—</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-t2">Phone Number Match Rate</span>
                <span className="text-sm font-semibold text-kblue">—</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-t2">Address Match Rate</span>
                <span className="text-sm font-semibold text-kteal">—</span>
              </div>
              <p className="font-mono text-[11px] text-t4">No UID2 match data available yet. Connect an identity partner to populate match rates.</p>
            </div>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
