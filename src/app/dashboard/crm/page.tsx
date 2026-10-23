"use client";
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useKikiStore } from "@/store";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, Badge, StatCard, AIThinking, Button, ScrollableTable } from "@/components/ui";
import { K } from "@/lib/kdls";

interface Lead { id: string; name: string; company: string; email: string; status: string; }
interface StatusBucket { status: string; count: number; }
const STATUSES = ["new", "contacted", "qualified", "customer", "lost"];

export default function CRMPage() {
  const [stats, setStats] = useState<{ totalContacts: number; pipelineValue: number; conversionRate: number; avgDealSize: number } | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [contacts, setContacts] = useState<Lead[]>([]);
  const [buckets, setBuckets] = useState<StatusBucket[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", company: "", status: "new" });
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const addToast = useKikiStore(s => s.addToast);
  const { token, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !token) router.push("/auth/login");
  }, [token, authLoading, router]);

  const loadData = useCallback(async () => {
    if (!token) return;
    try {
      const r = await fetch("/api/crm", { headers: { Authorization: `Bearer ${token}` } });
      const d = await r.json();
      if (!r.ok || !d.ok) throw new Error(d?.error || "Failed to load CRM data");
      setStats(d.data.stats);
      setLeads(d.data.recentLeads);
      setContacts(d.data.contacts || []);
      setBuckets(d.data.statusDistribution || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load CRM data");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { loadData(); }, [loadData]);

  const createContact = async () => {
    if (!token) return;
    if (!form.name.trim() || !form.email.trim()) { addToast("error", "Name and email are required"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/crm", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      const result = await res.json().catch(() => null);
      if (!res.ok || !result?.ok) throw new Error(result?.error || "Failed to create contact");
      setForm({ name: "", email: "", company: "", status: "new" });
      setShowForm(false);
      await loadData();
      addToast("success", "Contact added");
    } catch (e) {
      addToast("error", e instanceof Error ? e.message : "Failed to create contact");
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    if (!token) return;
    setBusyId(id);
    try {
      const res = await fetch("/api/crm", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id, status }),
      });
      const result = await res.json().catch(() => null);
      if (!res.ok || !result?.ok) throw new Error(result?.error || "Failed to update contact");
      setContacts(prev => prev.map(c => c.id === id ? { ...c, status } : c));
      await loadData();
      addToast("success", "Contact updated");
    } catch (e) {
      addToast("error", e instanceof Error ? e.message : "Failed to update contact");
    } finally {
      setBusyId(null);
    }
  };

  const deleteContact = async (id: string) => {
    if (!token) return;
    if (!confirm("Delete this contact?")) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/crm?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await res.json().catch(() => null);
      if (!res.ok || !result?.ok) throw new Error(result?.error || "Failed to delete contact");
      setContacts(prev => prev.filter(c => c.id !== id));
      await loadData();
      addToast("success", "Contact deleted");
    } catch (e) {
      addToast("error", e instanceof Error ? e.message : "Failed to delete contact");
    } finally {
      setBusyId(null);
    }
  };

  if (authLoading) return <DashboardLayout><div className="flex items-center justify-center p-8"><AIThinking text="Loading..." /></div></DashboardLayout>;
  if (!token) return null;

  return (
    <DashboardLayout>
      <div className="max-w-[1400px] p-[clamp(14px,3vw,28px)] text-t1">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
          <div>
            <h1 className="font-mono font-bold text-lg text-t1 tracking-tight mb-1">CRM</h1>
            <p className="font-mono text-caption text-t3">Manage contacts, pipeline, and customer relationships</p>
          </div>
          <Button size="sm" variant="secondary" onClick={() => setShowForm(v => !v)}>{showForm ? "Close" : "+ Add Contact"}</Button>
        </div>

        {showForm && (
          <Card className="mb-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
              <div>
                <label htmlFor="crm-name" className="block font-mono text-caption tracking-widest text-t4 mb-1.5">NAME</label>
                <input id="crm-name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Ada Lovelace" className="w-full bg-g850 border border-g700 rounded-kdls px-3 py-[10px] font-mono text-caption text-t1 outline-none focus:border-kblue" />
              </div>
              <div>
                <label htmlFor="crm-email" className="block font-mono text-caption tracking-widest text-t4 mb-1.5">EMAIL</label>
                <input id="crm-email" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="ada@company.com" className="w-full bg-g850 border border-g700 rounded-kdls px-3 py-[10px] font-mono text-caption text-t1 outline-none focus:border-kblue" />
              </div>
              <div>
                <label htmlFor="crm-company" className="block font-mono text-caption tracking-widest text-t4 mb-1.5">COMPANY</label>
                <input id="crm-company" value={form.company} onChange={e => setForm({ ...form, company: e.target.value })} placeholder="Analytical Engines" className="w-full bg-g850 border border-g700 rounded-kdls px-3 py-[10px] font-mono text-caption text-t1 outline-none focus:border-kblue" />
              </div>
              <div>
                <label htmlFor="crm-status" className="block font-mono text-caption tracking-widest text-t4 mb-1.5">STATUS</label>
                <select id="crm-status" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className="w-full bg-g850 border border-g700 rounded-kdls px-3 py-[10px] font-mono text-caption text-t1 outline-none focus:border-kblue">
                  {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <Button size="sm" loading={saving} onClick={createContact}>Add Contact</Button>
          </Card>
        )}

        {error && (
          <div className="mb-4 p-3 rounded-sm" style={{ background: `${K.danger}12`, border: `1px solid ${K.danger}40` }}>
            <p className="font-mono text-caption" style={{ color: K.tDanger }}>{error}</p>
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
            <h3 className="font-mono font-bold text-small text-t1 mb-3.5">Contact Segments</h3>
            {buckets.length === 0 ? (
              <p className="font-mono text-caption text-t3 py-2">No contacts yet.</p>
            ) : buckets.map((seg, i) => (
              <div key={i} className="flex justify-between items-center py-2.5" style={{ borderBottom: i < buckets.length - 1 ? `1px solid ${K.g800}` : undefined }}>
                <span className="font-mono text-caption font-semibold text-t1 capitalize">{seg.status}</span>
                <span className="font-mono text-caption font-bold text-kmint">{seg.count} contacts</span>
              </div>
            ))}
          </Card>

          <Card accent={K.blue}>
            <h3 className="font-mono font-bold text-small text-t1 mb-3.5">Recent Leads</h3>
            {leads.length === 0 ? (
              <p className="font-mono text-caption text-t3 py-2">No new leads.</p>
            ) : leads.map((lead, i) => (
              <div key={i} className="flex flex-wrap items-center gap-2.5 py-2.5" style={{ borderBottom: i < leads.length - 1 ? `1px solid ${K.g800}` : undefined }}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center font-mono text-caption font-bold flex-shrink-0 bg-g800 text-t2">
                  {lead.name.split(" ").map(n => n[0]).join("")}
                </div>
                <div className="flex-1 min-w-[120px]">
                  <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                    <span className="font-mono text-caption font-semibold text-t1">{lead.name}</span>
                    <Badge color={lead.status === "qualified" ? K.mint : lead.status === "contacted" ? K.gold : K.blue}>{lead.status}</Badge>
                  </div>
                  <span className="font-mono text-caption text-t3">{lead.company} · {lead.email}</span>
                </div>
              </div>
            ))}
          </Card>
        </div>

        <Card padding={0}>
          <div className="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-g800">
            <h3 className="font-mono font-bold text-small text-t1">All Contacts</h3>
            <span className="font-mono text-caption text-t4">{contacts.length} contacts</span>
          </div>
          {contacts.length === 0 ? (
            <p className="px-5 py-8 text-center font-mono text-caption text-t3">No contacts yet. Add your first contact above.</p>
          ) : (
            <ScrollableTable>
              <div className="min-w-[760px]">
                <div className="grid grid-cols-[1.2fr_1.2fr_1fr_150px_90px] gap-3 px-5 py-2 border-b border-g800 bg-g950">
                  {["NAME", "EMAIL", "COMPANY", "STATUS", "ACTION"].map(h => (
                    <span key={h} className="font-mono text-micro tracking-[0.1em] text-t4">{h}</span>
                  ))}
                </div>
                {contacts.map(c => (
                  <div key={c.id} className="grid grid-cols-[1.2fr_1.2fr_1fr_150px_90px] gap-3 px-5 py-2.5 items-center border-b border-g900 hover:bg-[var(--card-hover)]">
                    <span className="font-mono text-caption font-semibold text-t1 truncate">{c.name}</span>
                    <span className="font-mono text-caption text-t3 truncate">{c.email}</span>
                    <span className="font-mono text-caption text-t3 truncate">{c.company || "—"}</span>
                    <select
                      value={c.status}
                      disabled={busyId === c.id}
                      onChange={e => updateStatus(c.id, e.target.value)}
                      aria-label={`Status for ${c.name}`}
                      className="bg-g850 border border-g700 rounded-kdls px-2 py-1 font-mono text-caption text-t1 outline-none focus:border-kblue"
                    >
                      {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <div className="flex justify-end">
                      <Button variant="ghost" size="xs" loading={busyId === c.id} onClick={() => deleteContact(c.id)}>Delete</Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollableTable>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
}
