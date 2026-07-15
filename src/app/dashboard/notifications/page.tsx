"use client";
import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, Badge, Button } from "@/components/ui";
import { useAuth } from "@/hooks/useAuth";
import { notifications as notificationsApi, type Notification } from "@/lib/api";
import { K } from "@/lib/kdls";

export default function NotificationsPage() {
  const { token } = useAuth();
  const [items, setItems] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    notificationsApi.list(token).then(d => { setItems(d.notifications); setUnread(d.unread); setLoading(false); }).catch(() => setLoading(false));
  }, [token]);

  const handleMarkRead = async (id: string) => {
    if (!token) return;
    await notificationsApi.markRead(token, id);
    setItems(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    setUnread(prev => Math.max(0, prev - 1));
  };

  const handleMarkAllRead = async () => {
    if (!token) return;
    await notificationsApi.markAllRead(token);
    setItems(prev => prev.map(n => ({ ...n, read: true })));
    setUnread(0);
  };

  const severityColor = (s: string) => {
    switch (s) {
      case "critical": return K.danger;
      case "warning": return K.warn;
      case "success": return K.mint;
      default: return K.blue;
    }
  };

  return (
    <DashboardLayout>
      <div style={{ padding:"24px 28px", maxWidth:1400 }}>
        <div style={{ marginBottom:22, display:"flex", alignItems:"flex-start", justifyContent:"space-between" }}>
          <div>
            <h1 style={{ fontFamily:K.mono, fontWeight:700, fontSize:18, color:K.t1, letterSpacing:"-0.02em", marginBottom:4 }}>Notifications</h1>
            <p style={{ fontFamily:K.mono, fontSize:11, color:K.t3 }}>
              {loading ? "Loading..." : `${items.length} total · ${unread} unread`}
            </p>
          </div>
          <div style={{ display:"flex", gap:8, alignItems:"center" }}>
            <Badge color={K.blue} dot pulse>LIVE</Badge>
            {unread > 0 && <Button size="sm" variant="ghost" onClick={handleMarkAllRead}>Mark all read</Button>}
          </div>
        </div>

        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          {items.map((n: Notification) => (
            <Card key={n.id} accent={n.read ? undefined : severityColor(n.severity)} padding={0}>
              <div
                style={{
                  padding:"16px 20px",
                  display:"flex",
                  alignItems:"flex-start",
                  gap:14,
                  opacity: n.read ? 0.6 : 1,
                  cursor: n.read ? "default" : "pointer",
                  transition:"opacity 0.15s",
                }}
                onClick={() => !n.read && handleMarkRead(n.id)}
                onMouseEnter={e => (e.currentTarget.style.background = K.g850)}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
              >
                <div style={{
                  width:8, height:8, borderRadius:"50%", flexShrink:0, marginTop:5,
                  background: n.read ? K.g700 : severityColor(n.severity),
                }} />
                <div style={{ flex:1 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
                    <p style={{ fontFamily:K.mono, fontSize:12, fontWeight:700, color:K.t1 }}>{n.title}</p>
                    <Badge color={severityColor(n.severity)}>{n.severity.toUpperCase()}</Badge>
                  </div>
                  <p style={{ fontFamily:"Inter,sans-serif", fontSize:13, color:K.t3, lineHeight:1.5, marginBottom:4 }}>{n.body}</p>
                  <p style={{ fontFamily:K.mono, fontSize:10, color:K.t4 }}>{new Date(n.time).toLocaleString()}</p>
                </div>
                {!n.read && (
                  <button
                    onClick={e => { e.stopPropagation(); handleMarkRead(n.id); }}
                    style={{ fontFamily:K.mono, fontSize:10, color:K.blue, background:"none", border:"none", cursor:"pointer", flexShrink:0 }}
                  >
                    Mark read
                  </button>
                )}
              </div>
            </Card>
          ))}
          {loading && [1,2,3].map(i => (
            <Card key={i} padding={0}>
              <div style={{ padding:"16px 20px" }}>
                <div style={{ height:14, width:"40%", background:K.g850, borderRadius:2, marginBottom:8 }} />
                <div style={{ height:12, width:"70%", background:K.g850, borderRadius:2 }} />
              </div>
            </Card>
          ))}
          {!loading && items.length === 0 && (
            <Card>
              <div style={{ textAlign:"center", padding:"40px 0" }}>
                <p style={{ fontFamily:K.mono, fontSize:14, color:K.t3 }}>No notifications yet.</p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
