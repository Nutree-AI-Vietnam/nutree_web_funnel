import { NextRequest, NextResponse } from 'next/server';
import { isSameOriginMutation, LEAD_ACCESS_COOKIE } from '@/lib/handoff/lead-access-session';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest, context: RouteContext<'/api/web-funnel/leads/[leadId]/resend'>) {
  if (!isSameOriginMutation(request.headers, request.nextUrl.origin)) return NextResponse.json({ detail: 'Cross-site mutation rejected.' }, { status: 403 });
  const { leadId } = await context.params;
  const key = request.cookies.get(LEAD_ACCESS_COOKIE)?.value;
  const base = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, '');
  if (!key) return NextResponse.json({ detail: 'Draft session unavailable.' }, { status: 401 });
  if (!base) return NextResponse.json({ detail: 'Service unavailable.' }, { status: 503 });
  const upstream = await fetch(`${base}/v1/web-funnel/leads/${encodeURIComponent(leadId)}/resend`, { method: 'POST', headers: { 'X-Lead-Access-Key': key }, cache: 'no-store' });
  if (!upstream.ok) return NextResponse.json({ detail: 'Could not request a new link.' }, { status: upstream.status });
  return NextResponse.json({ accepted: true }, { headers: { 'Cache-Control': 'no-store' } });
}
