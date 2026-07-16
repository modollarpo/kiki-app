"use client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, Badge, Button, Input } from "@/components/ui";
import { useAuth } from "@/hooks/useAuth";
import { useKikiStore } from "@/store";
import { K } from "@/lib/kdls";
import { useState } from "react";

export default function SettingsPage() {
  const { user, token } = useAuth();
  const { logout } = useKikiStore();
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!token || !name.trim()) return;
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: name.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save settings");
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-[1000px] p-[clamp(14px,3vw,28px)]">
        <div className="mb-5">
          <h1 className="font-mono font-bold text-lg text-white tracking-tight mb-1">Settings</h1>
          <p className="font-mono text-[11px] text-gray-500">Account · security · preferences</p>
        </div>

        <Card className="mb-3">
          <h3 className="font-mono font-bold text-[13px] text-white mb-4">Account</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <Input label="Name" value={name} onChange={setName} />
            <Input label="Email" value={email} onChange={setEmail} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            <div>
              <p className="font-mono text-[10px] tracking-[0.1em] uppercase text-gray-500 mb-1.5">Role</p>
              <Badge color={K.blue}>{user?.role?.toUpperCase() || "ADVERTISER"}</Badge>
            </div>
            <div>
              <p className="font-mono text-[10px] tracking-[0.1em] uppercase text-gray-500 mb-1.5">Plan</p>
              <Badge color={K.gold}>{user?.plan?.toUpperCase() || "GROWTH"}</Badge>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            <div>
              <p className="font-mono text-[10px] tracking-[0.1em] uppercase text-gray-500 mb-1.5">Tenant</p>
              <p className="font-mono text-xs text-white">{user?.tenantName || "—"}</p>
            </div>
            <div>
              <p className="font-mono text-[10px] tracking-[0.1em] uppercase text-gray-500 mb-1.5">User ID</p>
              <p className="font-mono text-[11px] text-gray-600">{user?.id || "—"}</p>
            </div>
          </div>
          {saveError && (
            <div className="px-3 py-2 rounded mb-3" style={{ background: K.dangerT, border: `1px solid ${K.danger}40` }}>
              <p className="font-mono text-[11px]" style={{ color: K.danger }}>{saveError}</p>
            </div>
          )}
          <Button size="sm" loading={saving} onClick={handleSave}>{saved ? "✓ Saved" : "Save Changes"}</Button>
        </Card>

        <Card className="mb-3">
          <h3 className="font-mono font-bold text-[13px] text-white mb-3.5">Security</h3>
          {[{l:"Two-factor auth",v:"Enabled",c:K.mint},{l:"Session timeout",v:"24 hours",c:K.t2},{l:"API keys",v:"2 active",c:K.t2}].map(r => (
            <div key={r.l} className="flex items-center justify-between py-2.5 border-b border-g800">
              <span className="font-mono text-[11px] text-gray-400">{r.l}</span>
              <span className="font-mono text-[11px] font-bold" style={{ color: r.c }}>{r.v}</span>
            </div>
          ))}
        </Card>

        <Card>
          <h3 className="font-mono font-bold text-[13px] text-white mb-3">Danger Zone</h3>
          <p className="font-mono text-[11px] text-gray-500 mb-3">Sign out of your account on this device.</p>
          <Button variant="danger" size="sm" onClick={logout}>Sign Out</Button>
        </Card>
      </div>
    </DashboardLayout>
  );
}
