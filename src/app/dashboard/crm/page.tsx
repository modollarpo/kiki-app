"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, Badge, StatCard, AIThinking } from "@/components/ui";
import { K } from "@/lib/kdls";

interface Lead { name: string; company: string; email: string; status: string; }
interface StatusBucket { status: string; count: number; }

export default function CRMPage() {
  const [stats, setStats] = useState<{ totalContacts: number; pipelineValue: number; conversionRate: number; avgDealSize: number } | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [buckets, setBuckets] = useState<StatusBucket[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { token, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !token) router.push("/auth/login");
  }, [token, authLoading, router]);

  useEffect(() => {
    if (!token) return;
    fetch("/api/crm", { headers: { "Authorization": `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => {
        if (d.ok) {
          setStats(d.data.stats);
          setLeads(d.data.recentLeads);
          setBuckets(d.data.statusDistribution || []);
        }
      })
      .catch((err) => { setError(err?.message || "Failed to load CRM data"); setLoading(false); })
      .finally(() => setLoading(false));
  }, [token]);

  if (authLoading) return <DashboardLayout><div className="flex items-center justify-center p-8"><AIThinking text="Loading..." /></div></DashboardLayout>;
  if (!token) return null;

  return (
    <DashboardLayout>
      <div className="max-w-[1400px] p-[clamp(14px,3vw,28px)] text-t1">
        <div className="mb-5">
          <h1 className="font-mono font-bold text-lg text-t1 tracking-tight mb-1">CRM</h1>
          <p className="font-mono text-[11px] text-t3">Manage contacts, pipeline, and customer relationships</p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-sm" style={{ background: `${K.danger}12`, border: `1px solid ${K.danger}40` }}>
            <p className="font-mono text-[11px]" style={{ color: K.danger }}>{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <StatCard label="Pipeline Value" value={stats ? `$${(stats.pipelineValue / 1000).toFixed(0)}K` : "—"} accent={K.mint} loading={loading} />
          <StatCard label="Total Contacts" value={stats ? String(stats.totalContacts) : "—"} accent={K.blue} loading={loading} />
          <StatCard label="Conversion Rate" value={stats ? `${stats.conversionRate}%` : "—"} accent={K.mint} loading={loading} />
          <StatCard label="Avg Deal Size" value={stats ? `$${(stats.avgDealSize / 1000).toFixed(1)}K` : "—"} accent={K.gold} loading={loading} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-4">
          <Card accent={K.mint}>
            <h3 className="font-mono font-bold text-[13px] text-t1 mb-3.5">Contact Segments</h3>
            {buckets.length === 0 ? (
              <p className="font-mono text-[11px] text-t3 py-2">No contacts yet.</p>
            ) : buckets.map((seg, i) => (
              <div key={i} className="flex justify-between items-center py-2.5" style={{ borderBottom: i < buckets.length - 1 ? `1px solid ${K.g800}` : undefined }}>
                <span className="font-mono text-[11px] font-semibold text-t1 capitalize">{seg.status}</span>
                <span className="font-mono text-[11px] font-bold text-kmint">{seg.count} contacts</span>
              </div>
            ))}
          </Card>

          <Card accent={K.blue}>
            <h3 className="font-mono font-bold text-[13px] text-t1 mb-3.5">Recent Leads</h3>
            {leads.length === 0 ? (
              <p className="font-mono text-[11px] text-t3 py-2">No new leads.</p>
            ) : leads.map((lead, i) => (
              <div key={i} className="flex flex-wrap items-center gap-2.5 py-2.5" style={{ borderBottom: i < leads.length - 1 ? `1px solid ${K.g800}` : undefined }}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center font-mono text-[10px] font-bold flex-shrink-0 bg-g800 text-t2">
                  {lead.name.split(" ").map(n => n[0]).join("")}
                </div>
                <div className="flex-1 min-w-[120px]">
                  <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                    <span className="font-mono text-[11px] font-semibold text-t1">{lead.name}</span>
                    <Badge color={lead.status === "qualified" ? K.mint : lead.status === "contacted" ? K.gold : K.blue}>{lead.status}</Badge>
                  </div>
                  <span className="font-mono text-[10px] text-t3">{lead.company} · {lead.email}</span>
                </div>
              </div>
            ))}
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
