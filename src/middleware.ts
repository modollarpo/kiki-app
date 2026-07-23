import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { mobileApiMiddleware } from '@/lib/mobile/middleware';

export function middleware(request: NextRequest) {
  // Apply mobile API middleware
  const mobileResponse = mobileApiMiddleware(request);
  if (mobileResponse) return mobileResponse;

  // Add security headers to all responses
  const response = NextResponse.next();
  
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  // CSP for API routes
  if (request.nextUrl.pathname.startsWith('/api/')) {
    response.headers.set('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none';");
  }

  return response;
}

export const config = {
  matcher: [
    '/api/mobile/v1/:path*',
    '/api/:path*',
  ],
};