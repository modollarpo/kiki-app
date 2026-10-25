"use client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, Badge, Button, Input } from "@/components/ui";
import { useAuth } from "@/hooks/useAuth";
import { useKikiStore } from "@/store";
import { K } from "@/lib/kdls";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

interface ConnectedIntegration {
  id: string;
  platform: string;
  status: string;
  connectedAt: string;
  accountName?: string;
  lastSyncAt?: string;
}

interface PlatformOption {
  id?: string;
  platformId?: string;
  name: string;
  supportsOAuth?: boolean;
}

interface MfaStatus {
  enabled: boolean;
  configured: boolean;
  backupCodesRemaining: number;
}

export default function SettingsPage() {
  const router = useRouter();
  const { user, token, logout: authLogout } = useAuth();
  const { logout: storeLogout, addToast } = useKikiStore();

  const handleSignOut = () => {
    authLogout();
    storeLogout();
    router.push("/auth/login");
  };

  const [name, setName] = useState(user?.name || "");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [integrations, setIntegrations] = useState<ConnectedIntegration[]>([]);
  const [platforms, setPlatforms] = useState<PlatformOption[]>([]);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);

  const [manualPlatform, setManualPlatform] = useState<string | null>(null);
  const [manualToken, setManualToken] = useState("");
  const [manualRefreshToken, setManualRefreshToken] = useState("");
  const [manualAccountId, setManualAccountId] = useState("");
  const [manualAccountName, setManualAccountName] = useState("");
  const [manualSaving, setManualSaving] = useState(false);
  const [manualError, setManualError] = useState<string | null>(null);

  const [mfaStatus, setMfaStatus] = useState<MfaStatus | null>(null);
  const [mfaSetup, setMfaSetup] = useState<{ secret: string; otpauth: string; qrDataUrl: string } | null>(null);
  const [mfaCode, setMfaCode] = useState("");
  const [mfaBusy, setMfaBusy] = useState(false);
  const [mfaError, setMfaError] = useState<string | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);
  const [disablingMfa, setDisablingMfa] = useState(false);
  const [disableCode, setDisableCode] = useState("");

  const loadIntegrations = useCallback(async () => {
    if (!token) return;
    try {
      const [connectedRes, listRes] = await Promise.all([
        fetch("/api/integrations", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/integrations?action=list", { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const connectedData = await connectedRes.json();
      const listData = await listRes.json();
      if (connectedData.ok) setIntegrations(connectedData.data || []);
      if (listData.ok) setPlatforms(listData.data || []);
    } catch {
      addToast("error", "Failed to load integrations");
    }
  }, [token, addToast]);

  const parseApiResponse = async (res: Response) => {
    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      const text = await res.text();
      if (text.includes("<!DOCTYPE") || text.includes("<html")) {
        throw new Error("Server returned HTML page (Endpoint not found / Server starting). Please restart `npm run dev`.");
      }
      throw new Error(`Server error (${res.status}): ${text.slice(0, 80)}`);
    }
    const data = await res.json();
    if (!res.ok || !data.ok) {
      throw new Error(data.error || `Request failed (${res.status})`);
    }
    return data;
  };

  const loadMfaStatus = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch("/api/auth/mfa/status", { headers: { Authorization: `Bearer ${token}` } });
      const data = await parseApiResponse(res);
      if (data.ok) setMfaStatus({ enabled: !!data.enabled, configured: !!data.configured, backupCodesRemaining: data.backupCodesRemaining || 0 });
    } catch { /* status is non-critical */ }
  }, [token]);

  useEffect(() => {
    if (!token) return;
    loadIntegrations();
    loadMfaStatus();
  }, [token, loadIntegrations, loadMfaStatus]);

  const handleConnect = async (platformId: string) => {
    if (!token) return;
    setConnecting(platformId);
    try {
      const res = await fetch(`/api/integrations?action=oauth_url&platform=${platformId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.ok && data.data?.url) {
        window.location.href = data.data.url;
      } else {
        addToast("error", data.error || "OAuth is not configured for this platform");
      }
    } catch {
      addToast("error", "Failed to start OAuth flow");
    } finally {
      setConnecting(null);
    }
  };

  const handleDisconnect = async (platformId: string) => {
    if (!token) return;
    if (!confirm(`Disconnect ${platformId}? Autonomous execution will stop for this platform.`)) return;
    setDisconnecting(platformId);
    try {
      const res = await fetch("/api/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: "disconnect", platform: platformId }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Disconnect failed");
      addToast("success", `${platformId} disconnected`);
      await loadIntegrations();
    } catch (err) {
      addToast("error", err instanceof Error ? err.message : "Disconnect failed");
    } finally {
      setDisconnecting(null);
    }
  };

  const startManualConnect = (platformId: string) => {
    setManualPlatform(platformId);
    setManualToken("");
    setManualRefreshToken("");
    setManualAccountId("");
    setManualAccountName("");
    setManualError(null);
  };

  const handleManualConnect = async () => {
    if (!token || !manualPlatform) return;
    if (!manualToken.trim()) {
      setManualError("Access token is required");
      return;
    }
    setManualSaving(true);
    setManualError(null);
    try {
      const res = await fetch("/api/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          action: "connect_manual",
          platform: manualPlatform,
          accessToken: manualToken.trim(),
          refreshToken: manualRefreshToken.trim() || undefined,
          accountId: manualAccountId.trim() || undefined,
          accountName: manualAccountName.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Validation failed");
      addToast("success", `${manualPlatform} connected${data.data?.accountName ? ` as ${data.data.accountName}` : ""}`);
      setManualPlatform(null);
      await loadIntegrations();
    } catch (err) {
      setManualError(err instanceof Error ? err.message : "Validation failed");
    } finally {
      setManualSaving(false);
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

  const startMfaSetup = async () => {
    if (!token) return;
    setMfaBusy(true);
    setMfaError(null);
    setBackupCodes(null);
    setMfaCode("");
    try {
      const res = await fetch("/api/auth/mfa/setup", { method: "POST", headers: { Authorization: `Bearer ${token}` } });
      const data = await parseApiResponse(res);
      setMfaSetup({ secret: data.secret, otpauth: data.otpauth, qrDataUrl: data.qrDataUrl });
    } catch (err) {
      setMfaError(err instanceof Error ? err.message : "Failed to start MFA setup");
    } finally {
      setMfaBusy(false);
    }
  };

  const confirmMfaSetup = async () => {
    if (!token || !mfaCode.trim()) {
      setMfaError("Enter the 6-digit code from your authenticator app");
      return;
    }
    setMfaBusy(true);
    setMfaError(null);
    try {
      const res = await fetch("/api/auth/mfa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ token: mfaCode.trim() }),
      });
      const data = await parseApiResponse(res);
      setBackupCodes(Array.isArray(data.backupCodes) ? data.backupCodes : []);
      setMfaSetup(null);
      addToast("success", "Two-factor authentication enabled");
      await loadMfaStatus();
    } catch (err) {
      setMfaError(err instanceof Error ? err.message : "Invalid code");
    } finally {
      setMfaBusy(false);
    }
  };

  const handleDisableMfa = async () => {
    if (!token || !disableCode.trim()) {
      setMfaError("Enter a current authenticator or backup code");
      return;
    }
    setMfaBusy(true);
    setMfaError(null);
    try {
      const res = await fetch("/api/auth/mfa/disable", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ token: disableCode.trim() }),
      });
      await parseApiResponse(res);
      setDisablingMfa(false);
      setDisableCode("");
      setBackupCodes(null);
      addToast("success", "Two-factor authentication disabled");
      await loadMfaStatus();
    } catch (err) {
      setMfaError(err instanceof Error ? err.message : "Failed to disable MFA");
    } finally {
      setMfaBusy(false);
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
              <p className="font-mono text-caption text-t4 break-all">{user?.id || "—"}</p>
            </div>
          </div>
          {saveError && (
            <div className="px-3 py-2 rounded mb-3" style={{ background: K.dangerT, border: `1px solid ${K.danger}40` }}>
              <p className="font-mono text-caption" style={{ color: K.tDanger }}>{saveError}</p>
            </div>
          )}
          <Button size="sm" loading={saving} onClick={handleSave}>{saved ? "✓ Saved" : "Save Changes"}</Button>
        </Card>

        <Card className="mb-3">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <h3 className="font-mono font-bold text-small text-t1">Two-Factor Authentication</h3>
            {mfaStatus && <Badge color={mfaStatus.enabled ? K.mint : K.warn}>{mfaStatus.enabled ? "ENABLED" : "DISABLED"}</Badge>}
          </div>
          <p className="font-mono text-caption text-t3 mb-4">
            Protect your account with a time-based one-time password (TOTP) from any authenticator app.
          </p>

          {mfaError && (
            <div className="px-3 py-2 rounded mb-3" style={{ background: K.dangerT, border: `1px solid ${K.danger}40` }}>
              <p className="font-mono text-caption" style={{ color: K.tDanger }}>{mfaError}</p>
            </div>
          )}

          {!mfaStatus?.enabled && !mfaSetup && (
            <Button size="sm" loading={mfaBusy} onClick={startMfaSetup}>Enable 2FA</Button>
          )}

          {mfaSetup && (
            <div className="p-4 rounded-sm bg-g850 border border-g800">
              <p className="font-mono text-caption text-t2 mb-3">Scan this QR code with your authenticator app.</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={mfaSetup.qrDataUrl} alt="MFA QR code" width={200} height={200} className="bg-white p-1 rounded-sm mb-3" />
              <p className="font-mono text-caption text-t3 mb-1">Manual entry key</p>
              <p className="font-mono text-caption text-t1 break-all mb-3">{mfaSetup.secret}</p>
              <div className="max-w-[280px] mb-3">
                <Input
                  label="Verification Code"
                  placeholder="123456"
                  value={mfaCode}
                  onChange={v => { setMfaCode(v); setMfaError(null); }}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" loading={mfaBusy} onClick={confirmMfaSetup}>Verify & Enable</Button>
                <Button size="sm" variant="ghost" onClick={() => { setMfaSetup(null); setMfaCode(""); setMfaError(null); }}>Cancel</Button>
              </div>
            </div>
          )}

          {backupCodes && backupCodes.length > 0 && (
            <div className="p-4 rounded-sm mb-3" style={{ background: `${K.gold}10`, border: `1px solid ${K.gold}40` }}>
              <p className="font-mono text-caption font-bold mb-2" style={{ color: K.gold }}>Save your backup codes</p>
              <p className="font-mono text-caption text-t3 mb-2">Each code can be used once if you lose access to your authenticator. These will not be shown again.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                {backupCodes.map(c => <code key={c} className="font-mono text-caption text-t1">{c}</code>)}
              </div>
            </div>
          )}

          {mfaStatus?.enabled && (
            <div className="flex flex-col gap-3">
              <p className="font-mono text-caption text-t3">
                {mfaStatus.backupCodesRemaining} backup code{mfaStatus.backupCodesRemaining === 1 ? "" : "s"} remaining.
              </p>
              {!disablingMfa ? (
                <div>
                  <Button size="sm" variant="danger" onClick={() => { setDisablingMfa(true); setMfaError(null); }}>Disable 2FA</Button>
                </div>
              ) : (
                <div className="max-w-[320px]">
                  <Input
                    label="Current Code"
                    placeholder="123456 or backup code"
                    value={disableCode}
                    onChange={v => { setDisableCode(v); setMfaError(null); }}
                  />
                  <div className="flex flex-wrap gap-2 mt-2">
                    <Button size="sm" variant="danger" loading={mfaBusy} onClick={handleDisableMfa}>Confirm Disable</Button>
                    <Button size="sm" variant="ghost" onClick={() => { setDisablingMfa(false); setDisableCode(""); setMfaError(null); }}>Cancel</Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </Card>

        <Card className="mb-3">
          <h3 className="font-mono font-bold text-small text-t1 mb-3.5">Integrations</h3>
          <p className="font-mono text-caption text-t3 mb-4">
            Connect ad accounts, CMS, and CRM. Use OAuth where supported, or paste an API access token.
          </p>

          <div className="grid grid-cols-1 gap-3">
            {platforms.length === 0 ? (
              <p className="font-mono text-caption text-t3 py-2">No platforms available. Check that integrations are configured.</p>
            ) : platforms.map(p => {
              const platformId = p.platformId ?? p.id ?? "";
              const connected = integrations.find(i => i.platform === platformId);
              const isManual = manualPlatform === platformId;
              return (
                <div key={platformId || p.name} className="p-3 rounded-sm bg-g850 border border-g800">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-mono text-caption font-bold text-t1 capitalize break-all">{p.name || platformId}</p>
                      <p className="font-mono text-caption text-t3 mt-1 break-all">
                        {connected ? (connected.accountName || "Connected") : "Not connected"}
                        {connected?.lastSyncAt ? ` · synced ${new Date(connected.lastSyncAt).toLocaleString()}` : ""}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {connected ? (
                        <>
                          <Badge color={K.mint}>Connected</Badge>
                          <Button
                            size="sm"
                            variant="ghost"
                            loading={disconnecting === platformId}
                            onClick={() => handleDisconnect(platformId)}
                            style={{ color: K.danger }}
                          >
                            Disconnect
                          </Button>
                        </>
                      ) : (
                        <>
                          {p.supportsOAuth !== false && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleConnect(platformId)}
                              loading={connecting === platformId}
                            >
                              Connect OAuth
                            </Button>
                          )}
                          <Button size="sm" variant="ghost" onClick={() => isManual ? setManualPlatform(null) : startManualConnect(platformId)}>
                            {isManual ? "Cancel" : "Use API token"}
                          </Button>
                        </>
                      )}
                    </div>
                  </div>

                  {isManual && !connected && (
                    <div className="mt-3 pt-3 border-t border-g800">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
                        <Input label="Access Token" type="password" placeholder="Paste access token" value={manualToken} onChange={setManualToken} />
                        <Input label="Refresh Token (optional)" type="password" placeholder="Paste refresh token" value={manualRefreshToken} onChange={setManualRefreshToken} />
                        <Input label="Account ID (optional)" placeholder="act_123456" value={manualAccountId} onChange={setManualAccountId} />
                        <Input label="Account Name (optional)" placeholder="Main ad account" value={manualAccountName} onChange={setManualAccountName} />
                      </div>
                      {manualError && (
                        <div className="px-3 py-2 rounded mb-2" style={{ background: K.dangerT, border: `1px solid ${K.danger}40` }}>
                          <p className="font-mono text-caption" style={{ color: K.tDanger }}>{manualError}</p>
                        </div>
                      )}
                      <Button size="sm" loading={manualSaving} onClick={handleManualConnect}>Validate & Connect</Button>
                    </div>
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
