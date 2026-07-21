export const dynamic = "force-dynamic";
import { getDb } from "@/lib/db";
import { getUserFromRequest, json, jsonError } from "@/lib/auth";
import { logger, handleApiError } from "@/lib/logger";

export async function GET(req: Request) {
  const user = getUserFromRequest(req);
  if (!user) return jsonError("Unauthorized", 401);

  try {
    const db = await getDb();
    const notifications = await db.prepare("SELECT * FROM notifications WHERE tenant_id = ? ORDER BY created_at DESC").all(user.tenantId) as Array<{
      id: string; tenant_id: string; user_id: string; severity: string;
      title: string; body: string; read: number; link: string | null; created_at: string;
    }>;

    const unread = notifications.filter(n => !n.read).length;

    return json({
      notifications: notifications.map(n => ({
        id: n.id, tenantId: n.tenant_id, userId: n.user_id, severity: n.severity,
        title: n.title, body: n.body, read: !!n.read, link: n.link, time: n.created_at,
      })),
      unread,
    });
  } catch (error) {
    logger.error("notifications/GET failed", { message: error instanceof Error ? error.message : String(error) });
    return jsonError("Failed to load notifications", 500);
  }
}

export async function PATCH(req: Request) {
  const user = getUserFromRequest(req);
  if (!user) return jsonError("Unauthorized", 401);

  try {
    const body = await req.json();
    const { id, readAll } = body;

    const db = await getDb();

    if (readAll) {
      await db.prepare("UPDATE notifications SET read = 1 WHERE tenant_id = ? AND user_id = ?").run(user.tenantId, user.id);
      return json({ ok: true });
    }

    if (!id || typeof id !== "string") return jsonError("Notification id required");

    const notif = await db.prepare("SELECT * FROM notifications WHERE id = ? AND tenant_id = ?").get(id, user.tenantId);
    if (!notif) return jsonError("Not found", 404);

    await db.prepare("UPDATE notifications SET read = 1 WHERE id = ?").run(id);
    return json({ ok: true });
  } catch (e) {
    return handleApiError(e, "notifications/mark-read failed");
  }
}
