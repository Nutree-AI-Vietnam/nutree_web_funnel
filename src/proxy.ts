import { NextResponse, type NextRequest } from 'next/server';
import { FUNNEL_PATH_HEADER } from '@/lib/analytics/funnel-locale';
import { posthogProxyTarget } from '@/lib/analytics/posthog-proxy';

/**
 * Rewrites first-party PostHog traffic, and records the page path so the shared
 * root layout can pick one Meta pixel. The path header is taken from the URL.
 */
export function proxy(request: NextRequest) {
  const target = posthogProxyTarget(request.nextUrl.pathname);
  if (target) {
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

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(FUNNEL_PATH_HEADER, request.nextUrl.pathname);
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: [
    '/nt-relay/:path*',
    '/((?!_next/static|_next/image|nt-relay|.*\\..*).*)',
  ],
};
