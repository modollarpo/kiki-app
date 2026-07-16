"use client";

import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, Badge, ProgressBar, StatCard } from "@/components/ui";
import { K } from "@/lib/kdls";
import { useAuth } from "@/hooks/useAuth";

interface ConsentData {
  totalUsers: number;
  byPlan: { plan: string; count: number }[];
  compliance: {
    gdprEnabled: boolean;
    ccpaEnabled: boolean;
    dataRetentionDays: number;
    consentVersion: string;
    lastAuditDate: string;
  };
}

export default function ConsentPrivacyPage() {
  const { token } = useAuth();
  const [consentData, setConsentData] = useState<ConsentData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    fetch("/api/consent", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.data) setConsentData(d.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  const totalUsers = consentData?.totalUsers ?? 0;
  const compliance = consentData?.compliance;
  const byPlan = consentData?.byPlan ?? [];

  const regions = byPlan.map(p => ({
    region: `${p.plan?.toUpperCase() ?? "STANDARD"} Plan`,
    compliance: 0,
    users: p.count,
    consentRate: 0,
  }));

  const overallCompliance = regions.length > 0
    ? (regions.reduce((s, r) => s + r.compliance, 0) / regions.length).toFixed(1)
    : "—";

  const overallConsentRate = regions.length > 0
    ? (regions.reduce((s, r) => s + r.consentRate, 0) / regions.length).toFixed(1)
    : "—";

  return (
    <DashboardLayout>
      <div className="space-y-6 text-white p-[clamp(14px,3vw,28px)] max-w-[1400px]">
        <div>
          <h1 className="text-2xl font-semibold text-white">Consent & Privacy</h1>
          <p className="mt-1 text-sm text-gray-500">Manage user consent, privacy compliance, and data protection</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard label="Overall Compliance" value={loading ? "…" : `${overallCompliance}%`} sub={compliance?.gdprEnabled ? "GDPR enabled" : "GDPR pending"} accent={K.mint} />
          <StatCard label="Consent Rate" value={loading ? "…" : `${overallConsentRate}%`} sub={compliance?.ccpaEnabled ? "CCPA enabled" : "CCPA pending"} accent={K.mint} />
          <StatCard label="Total Users" value={loading ? "…" : totalUsers > 0 ? totalUsers.toLocaleString() : "—"} sub={compliance ? `Retention: ${compliance.dataRetentionDays}d` : "Loading…"} accent={K.mint} />
          <StatCard label="Privacy Sandbox" value={compliance?.gdprEnabled ? "Ready" : "Setup"} sub={compliance ? `Consent v${compliance.consentVersion}` : "Pending config"} accent={K.mint} />
        </div>

        <Card className="p-4 bg-g950 border-g850">
          <h3 className="text-sm font-semibold mb-3 text-white">Compliance by Region</h3>
          <div className="space-y-3">
            {regions.length > 0 ? regions.map((region, i) => (
              <div key={i} className="flex items-center gap-4 p-3 rounded-lg bg-g900">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-white">{region.region}</span>
                    <span className="text-sm font-semibold text-kmint">{region.compliance > 0 ? `${region.compliance}%` : "—"}</span>
                  </div>
                  {region.compliance > 0 && <ProgressBar value={region.compliance} max={100} color={K.mint} height={4} />}
                </div>
                <div className="text-right w-24">
                  <div className="text-xs text-gray-500">Users</div>
                  <div className="text-sm font-medium text-gray-400">{region.users > 1000 ? `${(region.users / 1000).toFixed(1)}K` : region.users}</div>
                </div>
                <div className="text-right w-24">
                  <div className="text-xs text-gray-500">Consent</div>
                  <div className="text-sm font-medium text-kblue">{region.consentRate > 0 ? `${region.consentRate}%` : "—"}</div>
                </div>
              </div>
            )) : (
              <p className="font-mono text-[11px] text-gray-500 py-4 text-center">No consent data yet. Start collecting user consent to see compliance metrics.</p>
            )}
          </div>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="p-4 bg-g950 border-g850">
            <h3 className="text-sm font-semibold mb-3 text-white">UID2 Adoption Status</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Hashed Email Match Rate</span>
                <span className="text-sm font-semibold text-kmint">—</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Phone Number Match Rate</span>
                <span className="text-sm font-semibold text-kblue">—</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Address Match Rate</span>
                <span className="text-sm font-semibold text-kteal">—</span>
              </div>
              <p className="font-mono text-[11px] text-gray-600">No UID2 match data available yet. Connect an identity partner to populate match rates.</p>
            </div>
          </Card>

          <Card className="p-4 bg-g950 border-g850">
            <h3 className="text-sm font-semibold mb-3 text-white">Privacy Sandbox Status</h3>
            <div className="space-y-3">
              {[
                { api: "Topics API", status: compliance?.gdprEnabled ? "Active" : "Pending", color: compliance?.gdprEnabled ? K.mint : K.warn },
                { api: "Protected Audiences", status: compliance?.gdprEnabled ? "Active" : "Pending", color: compliance?.gdprEnabled ? K.mint : K.warn },
                { api: "Attribution Reporting", status: compliance?.ccpaEnabled ? "Active" : "Pending", color: compliance?.ccpaEnabled ? K.mint : K.warn },
                { api: "FLEDGE", status: "Testing", color: K.gold },
                { api: "Trust Tokens", status: "Deprecated", color: K.warn },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-g900">
                  <span className="text-sm text-white">{item.api}</span>
                  <Badge style={{ background: item.color + "20", color: item.color }}>{item.status}</Badge>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
