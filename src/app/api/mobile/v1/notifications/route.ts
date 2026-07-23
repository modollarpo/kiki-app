// GET /api/mobile/v1/notifications
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireMobileAuth } from '@/lib/mobile/auth';

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireMobileAuth(request);
    if (!authResult.ok) return authResult.response;
    const { auth } = authResult;

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const type = searchParams.get('type');
    const status = searchParams.get('status') || 'unread';

    const db = await getDb();
    const tenantId = auth.tenantId;

    let query = `
      SELECT * FROM notifications
      WHERE tenant_id = ?
    `;
    const params: any[] = [tenantId];

    if (type) {
      query += ' AND type = ?';
      params.push(type);
    }

    if (status && status !== 'all') {
      query += ' AND status = ?';
      params.push(status);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, (page - 1) * limit);

    const notifications = await db.prepare(query).all(...params) as any[];

    // Get unread count
    const unreadCount = await db.prepare(
      'SELECT COUNT(*) as count FROM notifications WHERE tenant_id = ? AND status = ?'
    ).get(tenantId, 'unread') as any;

    return NextResponse.json({
      ok: true,
      data: {
        notifications: notifications.map(n => ({
          id: n.id,
          type: n.type,
          title: n.title,
          message: n.message,
          data: n.data ? JSON.parse(n.data) : null,
          priority: n.priority,
          status: n.status,
          actionRequired: n.action_required === 1,
          actionUrl: n.action_url,
          createdAt: n.created_at,
          readAt: n.read_at,
        })),
        pagination: {
          page,
          limit,
          hasMore: notifications.length === limit,
        },
        unreadCount: unreadCount?.count || 0,
      },
    });
  } catch (error) {
    console.error('Notifications error:', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to fetch notifications', code: 'FETCH_FAILED' },
      { status: 500 }
    );
  }
}

// POST /api/mobile/v1/notifications - Register push token
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireMobileAuth(request);
    if (!authResult.ok) return authResult.response;
    const { auth } = authResult;

    const body = await request.json();
    const { token, platform } = body;

    if (!token || !platform) {
      return NextResponse.json(
        { ok: false, error: 'Token and platform required', code: 'INVALID_INPUT' },
        { status: 400 }
      );
    }

    const db = await getDb();
    const tenantId = auth.tenantId;

    await db.prepare(`
      INSERT OR REPLACE INTO push_tokens (tenant_id, user_id, token, platform, updated_at)
      VALUES (?, ?, ?, ?, datetime('now'))
    `).run(auth.tenantId, auth.userId, token, platform);

    return NextResponse.json({ ok: true, message: 'Push token registered' });
  } catch (error) {
    console.error('Push token error:', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to register push token', code: 'REGISTER_FAILED' },
      { status: 500 }
    );
  }
}