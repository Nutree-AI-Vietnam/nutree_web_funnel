import { NextRequest, NextResponse } from 'next/server';
import { isSameOriginMutation } from '@/lib/handoff/lead-access-session';

export const dynamic = 'force-dynamic';

/** Forwards a signed reminder opt-out from the email link to the backend. */
export async function POST(request: NextRequest) {
  if (!isSameOriginMutation(request.headers, request.nextUrl.origin)) return NextResponse.json({ detail: 'Cross-site mutation rejected.' }, { status: 403 });
  const base = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, '');
  const bffToken = process.env.WEB_FUNNEL_BFF_SHARED_SECRET;
  if (!base || !bffToken) return NextResponse.json({ detail: 'Service unavailable.' }, { status: 503 });
  const body = await request.json().catch(() => null) as { lead_id?: unknown; signature?: unknown } | null;
  if (typeof body?.lead_id !== 'string' || typeof body.signature !== 'string' || !/^[a-f0-9]{64}$/.test(body.signature)) {
    return NextResponse.json({ detail: 'Not found' }, { status: 404 });
  }
  const upstream = await fetch(`${base}/v1/web-funnel/unsubscribe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Web-Funnel-BFF-Token': bffToken },
    body: JSON.stringify({ lead_id: body.lead_id, signature: body.signature }),
    cache: 'no-store',
  });
  return NextResponse.json({ ok: upstream.ok }, { status: upstream.ok ? 200 : 404, headers: { 'Cache-Control': 'no-store' } });
}
