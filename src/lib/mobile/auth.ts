// Mobile API Authentication
import { NextRequest } from 'next/server';
import { SignJWT, jwtVerify } from 'jose';
import { getDb } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

const ACCESS_TOKEN_SECRET = new TextEncoder().encode(
  process.env.MOBILE_JWT_SECRET || process.env.JWT_SECRET || 'kiki-mobile-secret-change-in-production'
);

const REFRESH_TOKEN_SECRET = new TextEncoder().encode(
  process.env.MOBILE_REFRESH_SECRET || 'kiki-mobile-refresh-secret-change-in-production'
);

export { ACCESS_TOKEN_SECRET as JWT_SECRET, REFRESH_TOKEN_SECRET as REFRESH_SECRET };

export interface MobileAuthPayload {
  sub: string;           // user id
  email: string;
  tenantId: string;
  role: string;
  type: 'access' | 'refresh';
  deviceId?: string;
  iat: number;
  exp: number;
}

export async function signAccessToken(payload: Omit<MobileAuthPayload, 'type' | 'iat' | 'exp'>): Promise<string> {
  return new SignJWT({ ...payload, type: 'access' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('15m')
    .sign(ACCESS_TOKEN_SECRET);
}

export async function signRefreshToken(payload: Omit<MobileAuthPayload, 'type' | 'iat' | 'exp'>): Promise<string> {
  return new SignJWT({ ...payload, type: 'refresh' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(REFRESH_TOKEN_SECRET);
}

export async function verifyAccessToken(token: string): Promise<MobileAuthPayload | null> {
  try {
    const { payload } = await jwtVerify(token, ACCESS_TOKEN_SECRET);
    return payload as unknown as MobileAuthPayload;
  } catch {
    // Fall back to web auth token format
    const webPayload = verifyToken(token);
    if (!webPayload) return null;
    return {
      sub: webPayload.sub,
      email: webPayload.email,
      tenantId: webPayload.tenantId,
      role: webPayload.role,
      type: 'access',
      iat: webPayload.iat,
      exp: webPayload.exp,
    };
  }
}

export async function verifyRefreshToken(token: string): Promise<MobileAuthPayload | null> {
  try {
    const { payload } = await jwtVerify(token, REFRESH_TOKEN_SECRET);
    return payload as unknown as MobileAuthPayload;
  } catch {
    return null;
  }
}

export interface MobileAuthContext {
  userId: string;
  tenantId: string;
  email: string;
  role: string;
  deviceId?: string;
}

export type AuthResult =
  | { ok: true; auth: MobileAuthContext }
  | { ok: false; response: Response };

export async function requireMobileAuth(request: NextRequest): Promise<AuthResult> {
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return {
      ok: false,
      response: new Response(
        JSON.stringify({ ok: false, error: 'Authorization header required', code: 'UNAUTHORIZED' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    };
  }

  const token = authHeader.slice(7);
  const payload = await verifyAccessToken(token);
  
  if (!payload || payload.type !== 'access') {
    return {
      ok: false,
      response: new Response(
        JSON.stringify({ ok: false, error: 'Invalid or expired token', code: 'INVALID_TOKEN' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    };
  }

  // Verify user still exists and is active
  const db = await getDb();
  const user = await db.prepare('SELECT id, status FROM users WHERE id = ?').get(payload.sub);
  
  if (!user || user.status !== 'active') {
    return {
      ok: false,
      response: new Response(
        JSON.stringify({ ok: false, error: 'User not found or inactive', code: 'USER_INACTIVE' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    };
  }

  return {
    ok: true,
    auth: {
      userId: payload.sub,
      tenantId: payload.tenantId,
      email: payload.email,
      role: payload.role,
      deviceId: payload.deviceId,
    }
  };
}

export async function optionalMobileAuth(request: NextRequest): Promise<MobileAuthContext | null> {
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.slice(7);
  const payload = await verifyAccessToken(token);
  
  if (!payload || payload.type !== 'access') {
    return null;
  }

  return {
    userId: payload.sub,
    tenantId: payload.tenantId,
    email: payload.email,
    role: payload.role,
    deviceId: payload.deviceId,
  };
}

// Device registration
export async function registerDevice(
  userId: string,
  deviceId: string,
  platform: string,
  appVersion: string,
  pushToken?: string
) {
  const db = await getDb();
  
  await db.prepare(`
    INSERT OR REPLACE INTO user_devices (user_id, device_id, platform, app_version, push_token, last_active)
    VALUES (?, ?, ?, ?, ?, datetime('now'))
  `).run(userId, deviceId, platform, appVersion, pushToken || null);
}

export async function updateDeviceLastActive(deviceId: string) {
  const db = await getDb();
  await db.prepare('UPDATE user_devices SET last_active = datetime("now") WHERE device_id = ?').run(deviceId);
}