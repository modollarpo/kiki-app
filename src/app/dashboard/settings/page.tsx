"use client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, Badge, Button, Input } from "@/components/ui";
import { useAuth } from "@/hooks/useAuth";
import { useKikiStore } from "@/store";
import { K } from "@/lib/kdls";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SettingsPage() {
  const router = useRouter();
  const { user, token, logout: authLogout } = useAuth();
  const { logout: storeLogout } = useKikiStore();

  const handleSignOut = () => {
    authLogout();
    storeLogout();
    router.push("/auth/login");
  };
  const [name, setName] = useState(user?.name || "");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [integrations, setIntegrations] = useState<{ id: string; platform: string; status: string; connectedAt: string; accountName?: string }[]>([]);
  const [platforms, setPlatforms] = useState<{ id?: string; platformId?: string; name: string; description?: string; icon?: string; connected?: boolean }[]>([]);
  const [connecting, setConnecting] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    
    // Fetch user's connected platforms
    fetch("/api/integrations", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => {
        if (d.ok) setIntegrations(d.data || []);
      });
      
    // Fetch available supported platforms
    fetch("/api/integrations?action=list", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => {
        if (d.ok) setPlatforms(d.data || []);
      });
  }, [token]);

  const handleConnect = async (platformId: string) => {
    if (!token) return;
    setConnecting(platformId);
    try {
      const res = await fetch(`/api/integrations?action=oauth_url&platform=${platformId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.ok && data.data?.url) {
        window.location.href = data.data.url;
      }
    } catch (e) {
      console.error(e);
    } finally {
      setConnecting(null);
    }
  };

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
          <h1 className="font-mono font-bold text-lg text-t1 tracking-tight mb-1">Settings</h1>
          <p className="font-mono text-caption text-t3">Account · security · preferences</p>
        </div>

        <Card className="mb-3">
          <h3 className="font-mono font-bold text-small text-t1 mb-4">Account</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <Input label="Name" value={name} onChange={setName} />
            <div>
              <p className="font-mono text-caption tracking-[0.1em] uppercase text-t3 mb-1.5">Email</p>
              <p className="font-mono text-xs text-t1 py-[10px] break-all">{user?.email || "—"}</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            <div>
              <p className="font-mono text-caption tracking-[0.1em] uppercase text-t3 mb-1.5">Role</p>
              <Badge color={K.blue}>{user?.role ? user.role.toUpperCase() : "—"}</Badge>
            </div>
            <div>
              <p className="font-mono text-caption tracking-[0.1em] uppercase text-t3 mb-1.5">Plan</p>
              <Badge color={K.gold}>{user?.plan ? user.plan.toUpperCase() : "—"}</Badge>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            <div>
              <p className="font-mono text-caption tracking-[0.1em] uppercase text-t3 mb-1.5">Tenant</p>
              <p className="font-mono text-xs text-t1">{user?.tenantName || "—"}</p>
            </div>
            <div>
              <p className="font-mono text-caption tracking-[0.1em] uppercase text-t3 mb-1.5">User ID</p>
              <p className="font-mono text-caption text-t4">{user?.id || "—"}</p>
            </div>
          </div>
          {saveError && (
            <div className="px-3 py-2 rounded mb-3" style={{ background: K.dangerT, border: `1px solid ${K.danger}40` }}>
              <p className="font-mono text-caption" style={{ color: K.danger }}>{saveError}</p>
            </div>
          )}
          <Button size="sm" loading={saving} onClick={handleSave}>{saved ? "✓ Saved" : "Save Changes"}</Button>
        </Card>

        <Card className="mb-3">
          <h3 className="font-mono font-bold text-small text-t1 mb-3.5">Integrations</h3>
          <p className="font-mono text-caption text-t3 mb-4">Connect your ad accounts, CMS, and CRM to enable autonomous execution.</p>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {platforms.length === 0 ? (
              <p className="font-mono text-caption text-t3 py-2">No platforms available. Check that integrations are configured.</p>
            ) : platforms.map(p => {
              const connected = integrations.find(i => i.platform === (p.platformId ?? p.id));
                return (
                  <div key={p.platformId ?? p.id ?? p.name} className="flex items-center justify-between p-3 rounded-sm bg-g850 border border-g800">
                    <div>
                      <p className="font-mono text-caption font-bold text-t1 capitalize">{p.name || p.platformId}</p>
                      <p className="font-mono text-caption text-t3 mt-1">
                        {connected ? (connected.accountName ?? "Connected") : "Not connected"}
                    </p>
                  </div>
                  {connected ? (
                    <Badge color={K.mint}>Connected</Badge>
                  ) : (
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={() => handleConnect(p.platformId ?? p.id ?? "")}
                      loading={connecting === (p.platformId ?? p.id ?? "")}
                    >
                      Connect
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </Card>

        <Card>
          <h3 className="font-mono font-bold text-small text-t1 mb-3">Danger Zone</h3>
          <p className="font-mono text-caption text-t3 mb-3">Sign out of your account on this device.</p>
          <Button variant="danger" size="sm" onClick={handleSignOut}>Sign Out</Button>
        </Card>
      </div>
    </DashboardLayout>
  );
}
