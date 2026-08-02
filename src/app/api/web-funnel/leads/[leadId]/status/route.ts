import { NextRequest, NextResponse } from 'next/server';
import { LEAD_ACCESS_COOKIE } from '@/lib/handoff/lead-access-session';
import { safeLeadProjection } from '@/lib/handoff/lead-projection';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest, context: RouteContext<'/api/web-funnel/leads/[leadId]/status'>) {
  const { leadId } = await context.params;
  const key = request.cookies.get(LEAD_ACCESS_COOKIE)?.value;
  const base = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, '');
  if (!key) return NextResponse.json({ detail: 'Draft session unavailable.' }, { status: 401 });
  if (!base) return NextResponse.json({ detail: 'Service unavailable.' }, { status: 503 });
  const upstream = await fetch(`${base}/v1/web-funnel/leads/${encodeURIComponent(leadId)}/status`, { headers: { 'X-Lead-Access-Key': key }, cache: 'no-store' });
  const payload = await upstream.json().catch(() => null);
  if (!upstream.ok) return NextResponse.json({ detail: 'Could not load checkout status.' }, { status: upstream.status });
  const safe = safeLeadProjection(payload);
  return safe ? NextResponse.json(safe, { headers: { 'Cache-Control': 'no-store' } }) : NextResponse.json({ detail: 'Invalid lead response.' }, { status: 502 });
}
