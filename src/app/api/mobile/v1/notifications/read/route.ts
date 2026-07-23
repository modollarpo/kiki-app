// POST /api/mobile/v1/notifications/read - Mark notifications as read
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireMobileAuth } from '@/lib/mobile/auth';

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireMobileAuth(request);
    if (!authResult.ok) return authResult.response;
    const { auth } = authResult;

    const body = await request.json();
    const { ids, markAll } = body;

    const db = await getDb();
    const tenantId = auth.tenantId;

    if (markAll) {
      await db.prepare(
        'UPDATE notifications SET status = ?, read_at = datetime(\'now\') WHERE tenant_id = ? AND status = ?'
      ).run('read', tenantId, 'unread');
      return NextResponse.json({ ok: true, message: 'All notifications marked as read' });
    }

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { ok: false, error: 'Notification IDs required', code: 'INVALID_INPUT' },
        { status: 400 }
      );
    }

    const placeholders = ids.map(() => '?').join(',');
    await db.prepare(
      `UPDATE notifications SET status = ?, read_at = datetime('now') WHERE tenant_id = ? AND id IN (${placeholders})`
    ).run('read', tenantId, ...ids);

    return NextResponse.json({ ok: true, message: 'Notifications marked as read' });
  } catch (error) {
    console.error('Mark read error:', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to mark notifications as read', code: 'UPDATE_FAILED' },
      { status: 500 }
    );
  }
}