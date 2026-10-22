import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { LEAD_ACCESS_COOKIE } from '@/lib/handoff/lead-access-session';

/**
 * Forward a MoMo request to the API with the server-held BFF token and the
 * browser's lead capability. MoMo keys never reach the quiz.
 */
export async function momoUpstream(
  request: NextRequest,
  path: string,
  init: { method?: 'GET' | 'POST'; body?: string } = {},
): Promise<{ response: NextResponse } | { status: number; payload: unknown }> {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, '');
  const bffToken = process.env.WEB_FUNNEL_BFF_SHARED_SECRET;
  const leadKey = request.cookies.get(LEAD_ACCESS_COOKIE)?.value;
  if (!base || !bffToken) return { response: NextResponse.json({ detail: 'Service unavailable.' }, { status: 503 }) };
  if (!leadKey) return { response: NextResponse.json({ detail: 'Draft session unavailable.' }, { status: 401 }) };
  try {
    const upstream = await fetch(`${base}${path}`, {
      method: init.method ?? 'GET',
      headers: {
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        'X-Lead-Access-Key': leadKey,
        'X-Web-Funnel-BFF-Token': bffToken,
        Origin: request.nextUrl.origin,
      },
      body: init.body,
      cache: 'no-store',
    });
    return { status: upstream.status, payload: await upstream.json().catch(() => null) };
  } catch {
    return { response: NextResponse.json({ detail: 'MoMo checkout is unavailable.' }, { status: 502 }) };
  }
}

export const NO_STORE = { 'Cache-Control': 'no-store' };
