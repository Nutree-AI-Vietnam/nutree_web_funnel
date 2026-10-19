import { NextResponse, type NextRequest } from 'next/server';
import { posthogProxyTarget } from '@/lib/analytics/posthog-proxy';

export function proxy(request: NextRequest) {
  const target = posthogProxyTarget(request.nextUrl.pathname);
  if (!target) return NextResponse.next();

  const headers = new Headers(request.headers);
  headers.set('host', target.hostname);
  headers.delete('cookie');
  headers.delete('authorization');

  const url = request.nextUrl.clone();
  url.protocol = 'https';
  url.hostname = target.hostname;
  url.port = '443';
  url.pathname = target.pathname;

  return NextResponse.rewrite(url, { request: { headers } });
}

export const config = {
  matcher: '/nt-relay/:path*',
};
