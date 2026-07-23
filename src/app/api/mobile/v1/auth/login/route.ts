// POST /api/mobile/v1/auth/login
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { verifyPassword, createSession } from '@/lib/auth';
import type { AuthUser } from '@/types';
import { SignJWT } from 'jose';

const REFRESH_SECRET = new TextEncoder().encode(process.env.REFRESH_SECRET || 'kiki-refresh-secret-2024');

async function signRefreshToken(payload: any) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setIssuer('kiki-mobile')
    .setAudience('kiki-api')
    .setExpirationTime('30d')
    .sign(REFRESH_SECRET);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, tenantId, rememberMe, deviceInfo } = body;

    if (!email || !password || !tenantId) {
      return NextResponse.json(
        { ok: false, error: 'Email, password, and tenant ID required', code: 'INVALID_INPUT' },
        { status: 400 }
      );
    }

    const db = await getDb();

    // Get tenant
    const tenant = await db.prepare('SELECT * FROM tenants WHERE id = ? AND status = ?').get(tenantId, 'active');
    if (!tenant) {
      return NextResponse.json(
        { ok: false, error: 'Invalid tenant', code: 'INVALID_TENANT' },
        { status: 401 }
      );
    }

    // Get user
    const user = await db.prepare('SELECT * FROM users WHERE email = ? AND tenant_id = ? AND status = ?').get(email, tenantId, 'active');
    if (!user) {
      return NextResponse.json(
        { ok: false, error: 'Invalid credentials', code: 'INVALID_CREDENTIALS' },
        { status: 401 }
      );
    }

    // Verify password
    const valid = verifyPassword(password, user.password);
    if (!valid) {
      return NextResponse.json(
        { ok: false, error: 'Invalid credentials', code: 'INVALID_CREDENTIALS' },
        { status: 401 }
      );
    }

    // Generate tokens using the same session system as web auth
    const authUser: AuthUser = {
      id: user.id,
      email: user.email,
      name: `${user.first_name || ''} ${user.last_name || ''}`.trim(),
      role: user.role,
      tenantId: user.tenant_id,
      tenantName: tenant.name,
      plan: tenant.plan,
      avatarInitials: ((user.first_name?.[0] || '') + (user.last_name?.[0] || '') || user.email[0]).toUpperCase(),
    };
    const accessToken = createSession(authUser);

    const refreshToken = await signRefreshToken({
      sub: user.id,
      tenantId: user.tenant_id,
      type: 'refresh',
    });

    // Store device info if provided
    if (deviceInfo) {
      await db.prepare(`
        INSERT INTO user_devices (user_id, tenant_id, device_id, platform, app_version, push_token, last_active)
        VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
        ON CONFLICT(device_id) DO UPDATE SET last_active = datetime('now'), push_token = ?
      `).run(user.id, tenantId, deviceInfo.deviceId, deviceInfo.platform, deviceInfo.appVersion, deviceInfo.pushToken, deviceInfo.pushToken);
    }

    // Update last login
    await db.prepare('UPDATE users SET last_login = datetime(\'now\') WHERE id = ?').run(user.id);

    return NextResponse.json({
      ok: true,
      data: {
        token: accessToken,
        refreshToken,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          role: user.role,
          tenantId: user.tenant_id,
        },
        tenant: {
          id: tenant.id,
          name: tenant.name,
          plan: tenant.plan,
        },
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { ok: false, error: 'Login failed', code: 'LOGIN_FAILED' },
      { status: 500 }
    );
  }
}