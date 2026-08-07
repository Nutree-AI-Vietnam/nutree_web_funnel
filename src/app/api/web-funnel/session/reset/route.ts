import { NextRequest, NextResponse } from 'next/server';
import { clearLeadAccessCookie, isSameOriginMutation, LEAD_ACCESS_COOKIE } from '@/lib/handoff/lead-access-session';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  if (!isSameOriginMutation(request.headers, request.nextUrl.origin)) return NextResponse.json({ detail: 'Cross-site mutation rejected.' }, { status: 403 });
  const key = request.cookies.get(LEAD_ACCESS_COOKIE)?.value;
  const body = await request.json().catch(() => null);
  const leadId = body && typeof body.lead_id === 'string' ? body.lead_id : null;
  const base = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, '');
  if (key && leadId) {
    if (!base) return NextResponse.json({ detail: 'Service unavailable.' }, { status: 503 });
    const upstream = await fetch(`${base}/v1/web-funnel/leads/${encodeURIComponent(leadId)}/reset`, { method: 'POST', headers: { 'X-Lead-Access-Key': key }, cache: 'no-store' });
    if (!upstream.ok) return NextResponse.json({ detail: 'Could not revoke checkout session.' }, { status: upstream.status });
  } else if (key) return NextResponse.json({ detail: 'Draft identifier unavailable.' }, { status: 400 });
  const response = NextResponse.json({ reset: true }, { headers: { 'Cache-Control': 'no-store' } });
  response.cookies.set(clearLeadAccessCookie());
  return response;
}
