// POST /api/mobile/v1/auth/me
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireMobileAuth } from '@/lib/mobile/auth';

interface UserRow {
  id: string; email: string; first_name: string; last_name: string; avatar: string;
  role: string; plan: string; status: string; created_at: string; last_login: string;
}
interface TenantRow { id: string; name: string; subdomain: string; plan: string; status: string }
interface DeviceRow { device_id: string; platform: string; app_version: string; last_active: string; push_token: string | null }

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireMobileAuth(request);
    if (!authResult.ok) return authResult.response;
    const { auth } = authResult;
    const db = await getDb();

    const user = await db.prepare(`
      SELECT id, email, first_name, last_name, avatar, role, plan, status, created_at, last_login
      FROM users WHERE id = ? AND tenant_id = ?
    `).get<UserRow>(auth.userId, auth.tenantId);

    if (!user) {
      return NextResponse.json(
        { ok: false, error: 'User not found', code: 'USER_NOT_FOUND' },
        { status: 404 }
      );
    }

    // Get tenant info
    const tenant = await db.prepare('SELECT id, name, subdomain, plan, status FROM tenants WHERE id = ?').get<TenantRow>(auth.tenantId);

    // Get user's active devices
    const devices = await db.prepare(`
      SELECT device_id, platform, app_version, last_active, push_token
      FROM user_devices
      WHERE user_id = ? AND last_active > datetime('now', '-30 days')
    `).all<DeviceRow>(user.id);

    return NextResponse.json({
      ok: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          avatar: user.avatar,
          role: user.role,
          plan: user.plan,
          status: user.status,
          createdAt: user.created_at,
          lastLogin: user.last_login,
        },
        tenant: tenant ? {
          id: tenant.id,
          name: tenant.name,
          subdomain: tenant.subdomain,
          plan: tenant.plan,
          status: tenant.status,
        } : null,
        devices: devices.map(d => ({
          deviceId: d.device_id,
          platform: d.platform,
          appVersion: d.app_version,
          lastActive: d.last_active,
          hasPushToken: !!d.push_token,
        })),
      },
    });
  } catch (error) {
    console.error('Get user error:', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to get user info', code: 'FETCH_FAILED' },
      { status: 500 }
    );
  }
}