"use client";
import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, Badge, Button, AIThinking } from "@/components/ui";
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
      <div className="p-[clamp(14px,3vw,28px)] max-w-[1400px]">
        <div className="mb-[22px] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h1 className="font-mono font-bold text-lg text-t1 tracking-tight mb-1">Notifications</h1>
            <p className="font-mono text-[11px] text-t3">
              {loading ? <span className="inline-flex items-center gap-1.5"><span className="animate-spin w-3 h-3 border-2 border-t-transparent rounded-full shrink-0" style={{ borderColor: `${K.blue}40`, borderTopColor: K.blue }} /><span className="font-mono text-[11px] text-t3">Loading...</span></span> : `${items.length} total · ${unread} unread`}
            </p>
          </div>
          <div className="flex gap-2 items-center">
            <Badge color={K.blue} dot pulse>LIVE</Badge>
            {unread > 0 && <Button size="sm" variant="ghost" onClick={handleMarkAllRead}>Mark all read</Button>}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          {items.map((n: Notification) => (
            <Card key={n.id} accent={n.read ? undefined : severityColor(n.severity)} padding={0}>
              <div
                className={`px-5 py-4 flex items-start gap-[14px] transition-opacity ${n.read ? "opacity-60 cursor-default" : "cursor-pointer hover:bg-g850"}`}
                onClick={() => !n.read && handleMarkRead(n.id)}
              >
                <div
                  className="w-2 h-2 rounded-full shrink-0 mt-[5px]"
                  style={{ background: n.read ? K.g700 : severityColor(n.severity) }}
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-mono text-xs font-bold text-t1">{n.title}</p>
                    <Badge color={severityColor(n.severity)}>{n.severity.toUpperCase()}</Badge>
                  </div>
                  <p className="font-sans text-[13px] text-t3 leading-relaxed mb-1">{n.body}</p>
                  <p className="font-mono text-[10px] text-t4">{new Date(n.time).toLocaleString()}</p>
                </div>
                {!n.read && (
                  <button
                    onClick={e => { e.stopPropagation(); handleMarkRead(n.id); }}
                    className="font-mono text-[10px] text-kblue bg-transparent border-none cursor-pointer shrink-0"
                  >
                    Mark read
                  </button>
                )}
              </div>
            </Card>
          ))}
          {loading && [1,2,3].map(i => (
            <Card key={i} padding={0}>
              <div className="px-5 py-4">
                <div className="h-[14px] w-[40%] bg-g850 rounded-kdls mb-2" />
                <div className="h-3 w-[70%] bg-g850 rounded-kdls" />
              </div>
            </Card>
          ))}
          {!loading && items.length === 0 && (
            <Card>
              <div className="text-center py-10">
                <p className="font-mono text-sm text-t3">No notifications yet.</p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
