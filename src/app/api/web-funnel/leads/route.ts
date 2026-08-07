import { NextRequest, NextResponse } from 'next/server';
import { isSameOriginMutation, LEAD_ACCESS_COOKIE } from '@/lib/handoff/lead-access-session';
import { safeLeadProjection } from '@/lib/handoff/lead-projection';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  if (!isSameOriginMutation(request.headers, request.nextUrl.origin)) return NextResponse.json({ detail: 'Cross-site mutation rejected.' }, { status: 403 });
  const base = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, '');
  const bffToken = process.env.WEB_FUNNEL_BFF_SHARED_SECRET;
  if (!base) return NextResponse.json({ detail: 'Service unavailable.' }, { status: 503 });
  if (!bffToken) return NextResponse.json({ detail: 'Service unavailable.' }, { status: 503 });
  const draftKey = request.cookies.get(LEAD_ACCESS_COOKIE)?.value;
  if (!draftKey) return NextResponse.json({ detail: 'Draft session unavailable.' }, { status: 401 });
  const requestId = request.headers.get('X-Request-ID') ?? crypto.randomUUID();
  const upstream = await fetch(`${base}/v1/web-funnel/leads`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Lead-Access-Key': draftKey, 'X-Request-ID': requestId, 'X-Web-Funnel-BFF-Token': bffToken, Origin: request.nextUrl.origin }, body: await request.text(), cache: 'no-store' });
  const payload = await upstream.json().catch(() => null);
  if (!upstream.ok) {
    const detail = typeof payload?.detail === 'string' || Array.isArray(payload?.detail)
      ? payload.detail
      : 'Could not save checkout draft.';
    return NextResponse.json({ detail, request_id: requestId }, { status: upstream.status, headers: { 'X-Request-ID': requestId } });
  }
  const safe = safeLeadProjection(payload);
  return safe ? NextResponse.json(safe, { status: upstream.status, headers: { 'Cache-Control': 'no-store' } }) : NextResponse.json({ detail: 'Invalid lead response.' }, { status: 502 });
}
