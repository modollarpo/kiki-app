// POST /api/mobile/v1/auth/refresh
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { createSession } from '@/lib/auth';
import { REFRESH_SECRET, REFRESH_ISSUER, REFRESH_AUDIENCE, signRefreshToken } from '@/lib/mobile/auth';
import { jwtVerify } from 'jose';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { refreshToken } = body;

    if (!refreshToken) {
      return NextResponse.json(
        { ok: false, error: 'Refresh token required', code: 'INVALID_INPUT' },
        { status: 400 }
      );
    }

    const { payload } = await jwtVerify(refreshToken, REFRESH_SECRET, {
      issuer: REFRESH_ISSUER,
      audience: REFRESH_AUDIENCE,
    });

    // Verify user still exists and is active
    const db = await getDb();
    const tenant = await db.prepare('SELECT * FROM tenants WHERE id = ?').get(payload.tenantId);
    const dbUser = await db.prepare('SELECT * FROM users WHERE id = ? AND tenant_id = ? AND status = ?').get(payload.sub, payload.tenantId, 'active');
    
    if (!dbUser || !tenant) {
      return NextResponse.json(
        { ok: false, error: 'User not found or inactive', code: 'USER_NOT_FOUND' },
        { status: 401 }
      );
    }

    // Generate new tokens
    const authUser = {
      id: dbUser.id,
      email: dbUser.email,
      name: `${dbUser.first_name || ''} ${dbUser.last_name || ''}`.trim(),
      role: dbUser.role,
      tenantId: dbUser.tenant_id,
      tenantName: tenant.name,
      plan: tenant.plan,
      avatarInitials: ((dbUser.first_name?.[0] || '') + (dbUser.last_name?.[0] || '') || dbUser.email[0]).toUpperCase(),
    };
    const accessToken = createSession(authUser);

    const newRefreshToken = await signRefreshToken({
      sub: dbUser.id,
      email: dbUser.email,
      role: dbUser.role,
      tenantId: dbUser.tenant_id,
    });

    return NextResponse.json({
      ok: true,
      data: {
        token: accessToken,
        refreshToken: newRefreshToken,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      },
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    return NextResponse.json(
      { ok: false, error: 'Invalid or expired refresh token', code: 'TOKEN_EXPIRED' },
      { status: 401 }
    );
  }
}