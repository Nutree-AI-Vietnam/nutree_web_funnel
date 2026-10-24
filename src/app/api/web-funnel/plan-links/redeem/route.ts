import { randomBytes } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { isSameOriginMutation, leadAccessCookie } from '@/lib/handoff/lead-access-session';
import { safeLeadProjection } from '@/lib/handoff/lead-projection';

export const dynamic = 'force-dynamic';

/**
 * Opens an emailed plan in this browser: a fresh draft key is minted here and the
 * backend binds the unpaid lead to it. The browser gets the lead projection, the
 * checkout email for Paddle and the answers to restore; never the key.
 */
export async function POST(request: NextRequest) {
  if (!isSameOriginMutation(request.headers, request.nextUrl.origin)) return NextResponse.json({ detail: 'Cross-site mutation rejected.' }, { status: 403 });
  const base = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, '');
  const bffToken = process.env.WEB_FUNNEL_BFF_SHARED_SECRET;
  if (!base || !bffToken) return NextResponse.json({ detail: 'Service unavailable.' }, { status: 503 });
  const body = await request.json().catch(() => null) as { token?: unknown } | null;
  if (typeof body?.token !== 'string' || body.token.length < 32 || body.token.length > 512) {
    return NextResponse.json({ detail: 'Not found' }, { status: 404 });
  }
  const accessKey = randomBytes(32).toString('base64url');
  const upstream = await fetch(`${base}/v1/web-funnel/plan-links/redeem`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Lead-Access-Key': accessKey, 'X-Web-Funnel-BFF-Token': bffToken },
    body: JSON.stringify({ token: body.token }),
    cache: 'no-store',
  });
  const payload = await upstream.json().catch(() => null) as Record<string, unknown> | null;
  const lead = safeLeadProjection(payload);
  if (!upstream.ok || !lead || !payload) return NextResponse.json({ detail: 'Not found' }, { status: upstream.ok ? 502 : upstream.status });
  const response = NextResponse.json({
    lead,
    email: typeof payload.email === 'string' ? payload.email : null,
    snapshot: payload.snapshot && typeof payload.snapshot === 'object' ? payload.snapshot : null,
    locale: payload.locale === 'vi' || payload.locale === 'en' ? payload.locale : null,
    units: payload.units === 'metric' || payload.units === 'imperial' ? payload.units : null,
  }, { headers: { 'Cache-Control': 'no-store' } });
  response.cookies.set(leadAccessCookie(accessKey));
  return response;
}
