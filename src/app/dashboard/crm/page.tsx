"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, Badge, StatCard } from "@/components/ui";
import { K } from "@/lib/kdls";

interface Lead { name: string; company: string; email: string; source: string; score: number; status: string; }
interface Segment { name: string; count: number; value: number; conversion: number; }

export default function CRMPage() {
  const [stats, setStats] = useState<{ totalContacts: number; pipelineValue: number; conversionRate: number; avgDealSize: number } | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [loading, setLoading] = useState(true);
  const { token, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !token) router.push("/auth/login");
  }, [token, authLoading, router]);
  if (authLoading) return <DashboardLayout><div style={{color:"var(--t2)",padding:"2rem"}}>Loading...</div></DashboardLayout>;
  if (!token) return null;

  useEffect(() => {
    if (!token) return;
    fetch("/api/crm", { headers: { "Authorization": `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setStats(d.data.stats);
          setLeads(d.data.recentLeads);
          setSegments(d.data.segments);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <DashboardLayout>
      <div className="max-w-[1400px] p-[clamp(14px,3vw,28px)] text-white">
        <div className="mb-5">
          <h1 className="font-mono font-bold text-lg text-white tracking-tight mb-1">CRM</h1>
          <p className="font-mono text-[11px] text-gray-500">Manage contacts, pipeline, and customer relationships</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <StatCard label="Pipeline Value" value={stats ? `$${(stats.pipelineValue / 1000).toFixed(0)}K` : "—"} delta={280} sub="+$280K this month" accent={K.mint} loading={loading} />
          <StatCard label="Total Contacts" value={stats ? String(stats.totalContacts) : "—"} delta={23} sub="+23 new leads" accent={K.blue} loading={loading} />
          <StatCard label="Conversion Rate" value={stats ? `${stats.conversionRate}%` : "—"} delta={2.1} sub="+2.1% improvement" accent={K.mint} loading={loading} />
          <StatCard label="Avg Deal Size" value={stats ? `$${(stats.avgDealSize / 1000).toFixed(1)}K` : "—"} delta={3.2} sub="+$3.2K vs last quarter" accent={K.gold} loading={loading} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          <Card accent={K.mint}>
            <h3 className="font-mono font-bold text-[13px] text-white mb-3.5">Segments</h3>
            {segments.map((seg, i) => (
              <div key={i} className="p-2.5 px-3 mb-2 rounded-sm bg-g850">
                <div className="flex justify-between mb-1">
                  <span className="font-mono text-[11px] font-semibold text-white">{seg.name}</span>
                  <span className="font-mono text-[11px] font-bold text-kmint">${(seg.value / 1000).toFixed(0)}K</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-mono text-[10px] text-gray-500">{seg.count} contacts</span>
                  <span className="font-mono text-[10px] text-gray-500">{seg.conversion}% conversion</span>
                </div>
              </div>
            ))}
          </Card>

          <Card accent={K.blue}>
            <h3 className="font-mono font-bold text-[13px] text-white mb-3.5">Lead Scoring</h3>
            {leads.map((lead, i) => (
              <div key={i} className="flex items-center gap-2.5 py-2.5" style={{ borderBottom: i < leads.length - 1 ? `1px solid ${K.g800}` : undefined }}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center font-mono text-[10px] font-bold flex-shrink-0 bg-g800 text-t2">
                  {lead.name.split(" ").map(n => n[0]).join("")}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="font-mono text-[11px] font-semibold text-white">{lead.name}</span>
                    <Badge color={lead.status === "qualified" ? K.mint : lead.status === "contacted" ? K.gold : K.blue}>{lead.status}</Badge>
                  </div>
                  <span className="font-mono text-[10px] text-gray-500">{lead.company} · {lead.source}</span>
                </div>
                <div className="text-right">
                  <div className="font-mono text-sm font-bold" style={{ color: lead.score >= 80 ? K.mint : lead.score >= 60 ? K.gold : K.danger }}>{lead.score}</div>
                  <div className="font-mono text-[10px] text-gray-600">score</div>
                </div>
              </div>
            ))}
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
