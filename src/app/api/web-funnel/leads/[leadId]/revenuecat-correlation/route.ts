import { NextRequest, NextResponse } from 'next/server';
import { isSameOriginMutation, LEAD_ACCESS_COOKIE } from '@/lib/handoff/lead-access-session';
import { safeRevenueCatCorrelationProjection } from '@/lib/handoff/lead-projection';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest, context: RouteContext<'/api/web-funnel/leads/[leadId]/revenuecat-correlation'>) {
  if (!isSameOriginMutation(request.headers, request.nextUrl.origin)) return NextResponse.json({ detail: 'Cross-site mutation rejected.' }, { status: 403 });
  const { leadId } = await context.params;
  const key = request.cookies.get(LEAD_ACCESS_COOKIE)?.value;
  const base = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, '');
  const bffToken = process.env.WEB_FUNNEL_BFF_SHARED_SECRET;
  const body = await request.json().catch(() => null);
  const appUserId = body && typeof body.app_user_id === 'string' ? body.app_user_id.trim() : '';
  if (!key) return NextResponse.json({ detail: 'Draft session unavailable.' }, { status: 401 });
  if (!base || !bffToken) return NextResponse.json({ detail: 'Service unavailable.' }, { status: 503 });
  if (!appUserId || appUserId.length > 255) return NextResponse.json({ detail: 'Invalid payment customer.' }, { status: 400 });
  const upstream = await fetch(`${base}/v1/web-funnel/leads/${encodeURIComponent(leadId)}/revenuecat-correlation`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Lead-Access-Key': key, 'X-Web-Funnel-BFF-Token': bffToken, Origin: request.nextUrl.origin }, body: JSON.stringify({ app_user_id: appUserId }), cache: 'no-store',
  });
  const payload = await upstream.json().catch(() => null);
  if (!upstream.ok) return NextResponse.json({ detail: 'Could not verify payment.' }, { status: upstream.status });
  const safe = safeRevenueCatCorrelationProjection(payload);
  return safe
    ? NextResponse.json({ ...safe.lead, preflight_token: safe.preflightToken }, { headers: { 'Cache-Control': 'no-store' } })
    : NextResponse.json({ detail: 'Invalid payment response.' }, { status: 502 });
}
