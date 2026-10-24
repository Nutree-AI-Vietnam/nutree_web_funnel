import { NextResponse, type NextRequest } from 'next/server';
import { posthogProxyTarget } from '@/lib/analytics/posthog-proxy';
import { localeForVisitor } from '@/lib/market/country';

/**
 * The homepage is the prerendered Vietnamese quiz that Vietnamese ads link to. A visitor outside Vietnam
 * whose browser does not list Vietnamese goes to the English quiz instead, with the same query string.
 */
function homepageRedirect(request: NextRequest): NextResponse | null {
  const locale = localeForVisitor(request.headers.get('x-vercel-ip-country'), request.headers.get('accept-language'));
  if (locale === 'vi') return null;
  const url = request.nextUrl.clone();
  url.pathname = '/survey/en';
  return NextResponse.redirect(url, 307);
}

export function proxy(request: NextRequest) {
  if (request.nextUrl.pathname === '/') return homepageRedirect(request) ?? NextResponse.next();

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
  matcher: ['/', '/nt-relay/:path*'],
};
