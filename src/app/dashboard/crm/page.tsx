"use client";
import { useState, useEffect } from "react";
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

  useEffect(() => {
    fetch("/api/crm")
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
  }, []);

  return (
    <DashboardLayout>
      <div style={{ padding: "24px 28px", maxWidth: 1400, color: K.t1 }}>
        <div style={{ marginBottom: 22 }}>
          <h1 style={{ fontFamily: K.mono, fontWeight: 700, fontSize: 18, color: K.t1, letterSpacing: "-0.02em", marginBottom: 4 }}>CRM</h1>
          <p style={{ fontFamily: K.mono, fontSize: 11, color: K.t3 }}>Manage contacts, pipeline, and customer relationships</p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 16 }}>
          <StatCard label="Pipeline Value" value={stats ? `$${(stats.pipelineValue / 1000).toFixed(0)}K` : "—"} delta={280} sub="+$280K this month" accent={K.mint} loading={loading} />
          <StatCard label="Total Contacts" value={stats ? String(stats.totalContacts) : "—"} delta={23} sub="+23 new leads" accent={K.blue} loading={loading} />
          <StatCard label="Conversion Rate" value={stats ? `${stats.conversionRate}%` : "—"} delta={2.1} sub="+2.1% improvement" accent={K.mint} loading={loading} />
          <StatCard label="Avg Deal Size" value={stats ? `$${(stats.avgDealSize / 1000).toFixed(1)}K` : "—"} delta={3.2} sub="+$3.2K vs last quarter" accent={K.gold} loading={loading} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
          <Card accent={K.mint}>
            <h3 style={{ fontFamily: K.mono, fontWeight: 700, fontSize: 13, color: K.t1, marginBottom: 14 }}>Segments</h3>
            {segments.map((seg, i) => (
              <div key={i} style={{ padding: "10px 12px", marginBottom: 8, background: K.g850, borderRadius: 2 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontFamily: K.mono, fontSize: 11, fontWeight: 600, color: K.t1 }}>{seg.name}</span>
                  <span style={{ fontFamily: K.mono, fontSize: 11, fontWeight: 700, color: K.mint }}>${(seg.value / 1000).toFixed(0)}K</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontFamily: K.mono, fontSize: 10, color: K.t3 }}>{seg.count} contacts</span>
                  <span style={{ fontFamily: K.mono, fontSize: 10, color: K.t3 }}>{seg.conversion}% conversion</span>
                </div>
              </div>
            ))}
          </Card>

          <Card accent={K.blue}>
            <h3 style={{ fontFamily: K.mono, fontWeight: 700, fontSize: 13, color: K.t1, marginBottom: 14 }}>Lead Scoring</h3>
            {leads.map((lead, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: i < leads.length - 1 ? `1px solid ${K.g800}` : undefined }}>
                <div style={{ width: 32, height: 32, borderRadius: "50%", background: K.g800, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: K.mono, fontSize: 10, fontWeight: 700, color: K.t2, flexShrink: 0 }}>
                  {lead.name.split(" ").map(n => n[0]).join("")}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                    <span style={{ fontFamily: K.mono, fontSize: 11, fontWeight: 600, color: K.t1 }}>{lead.name}</span>
                    <Badge color={lead.status === "qualified" ? K.mint : lead.status === "contacted" ? K.gold : K.blue}>{lead.status}</Badge>
                  </div>
                  <span style={{ fontFamily: K.mono, fontSize: 9, color: K.t3 }}>{lead.company} · {lead.source}</span>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontFamily: K.mono, fontSize: 14, fontWeight: 700, color: lead.score >= 80 ? K.mint : lead.score >= 60 ? K.gold : K.danger }}>{lead.score}</div>
                  <div style={{ fontFamily: K.mono, fontSize: 8, color: K.t4 }}>score</div>
                </div>
              </div>
            ))}
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
