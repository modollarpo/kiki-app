"use client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, Badge, Button, Input } from "@/components/ui";
import { useAuth } from "@/hooks/useAuth";
import { useKikiStore } from "@/store";
import { K } from "@/lib/kdls";
import { useState } from "react";

export default function SettingsPage() {
  const { user } = useAuth();
  const { logout } = useKikiStore();
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [saved, setSaved] = useState(false);

  const handleSave = () => { setSaved(true); setTimeout(() => setSaved(false), 2000); };

  return (
    <DashboardLayout>
      <div style={{ padding:"24px 28px", maxWidth:1000 }}>
        <div style={{ marginBottom:22 }}>
          <h1 style={{ fontFamily:K.mono, fontWeight:700, fontSize:18, color:K.t1, letterSpacing:"-0.02em", marginBottom:4 }}>Settings</h1>
          <p style={{ fontFamily:K.mono, fontSize:11, color:K.t3 }}>Account · security · preferences</p>
        </div>

        <Card style={{ marginBottom:12 }}>
          <h3 style={{ fontFamily:K.mono, fontWeight:700, fontSize:13, color:K.t1, marginBottom:16 }}>Account</h3>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:12 }}>
            <Input label="Name" value={name} onChange={setName} />
            <Input label="Email" value={email} onChange={setEmail} />
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:16 }}>
            <div>
              <p style={{ fontFamily:K.mono, fontSize:10, letterSpacing:"0.1em", color:K.t3, textTransform:"uppercase", marginBottom:6 }}>Role</p>
              <Badge color={K.blue}>{user?.role?.toUpperCase() || "ADVERTISER"}</Badge>
            </div>
            <div>
              <p style={{ fontFamily:K.mono, fontSize:10, letterSpacing:"0.1em", color:K.t3, textTransform:"uppercase", marginBottom:6 }}>Plan</p>
              <Badge color={K.gold}>{user?.plan?.toUpperCase() || "GROWTH"}</Badge>
            </div>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:16 }}>
            <div>
              <p style={{ fontFamily:K.mono, fontSize:10, letterSpacing:"0.1em", color:K.t3, textTransform:"uppercase", marginBottom:6 }}>Tenant</p>
              <p style={{ fontFamily:K.mono, fontSize:12, color:K.t1 }}>{user?.tenantName || "—"}</p>
            </div>
            <div>
              <p style={{ fontFamily:K.mono, fontSize:10, letterSpacing:"0.1em", color:K.t3, textTransform:"uppercase", marginBottom:6 }}>User ID</p>
              <p style={{ fontFamily:K.mono, fontSize:11, color:K.t4 }}>{user?.id || "—"}</p>
            </div>
          </div>
          <Button size="sm" onClick={handleSave}>{saved ? "✓ Saved" : "Save Changes"}</Button>
        </Card>

        <Card style={{ marginBottom:12 }}>
          <h3 style={{ fontFamily:K.mono, fontWeight:700, fontSize:13, color:K.t1, marginBottom:14 }}>Security</h3>
          {[{l:"Two-factor auth",v:"Enabled",c:K.mint},{l:"Session timeout",v:"24 hours",c:K.t2},{l:"API keys",v:"2 active",c:K.t2}].map(r => (
            <div key={r.l} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 0", borderBottom:`1px solid ${K.g800}` }}>
              <span style={{ fontFamily:K.mono, fontSize:11, color:K.t2 }}>{r.l}</span>
              <span style={{ fontFamily:K.mono, fontSize:11, fontWeight:700, color:r.c }}>{r.v}</span>
            </div>
          ))}
        </Card>

        <Card>
          <h3 style={{ fontFamily:K.mono, fontWeight:700, fontSize:13, color:K.t1, marginBottom:14 }}>Danger Zone</h3>
          <p style={{ fontFamily:K.mono, fontSize:11, color:K.t3, marginBottom:12 }}>Sign out of your account on this device.</p>
          <Button variant="danger" size="sm" onClick={logout}>Sign Out</Button>
        </Card>
      </div>
    </DashboardLayout>
  );
}
