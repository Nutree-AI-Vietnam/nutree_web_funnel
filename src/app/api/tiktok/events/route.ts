import { NextRequest, NextResponse } from 'next/server';
import { isSameOriginMutation } from '@/lib/handoff/lead-access-session';
import { clientIp } from '@/lib/analytics/events-api';
import { parseTiktokBrowserEvent, TIKTOK_EVENTS_API_URL, tiktokEventsApiBody } from '@/lib/analytics/tiktok-events-api';

export const dynamic = 'force-dynamic';

/** Browser bodies are a few hundred bytes. */
const MAX_BODY_LENGTH = 16_384;

/**
 * Forwards the browser's TikTok standard events to the Events API with the
 * same event_id, adding IP, user agent and the _ttp cookie. Inert (204) until
 * TIKTOK_EVENTS_API_ACCESS_TOKEN is set. Delivery failures are logged without
 * user data and never surface to the funnel.
 */
export async function POST(request: NextRequest) {
  if (!isSameOriginMutation(request.headers, request.nextUrl.origin)) return NextResponse.json({ detail: 'Cross-site mutation rejected.' }, { status: 403 });
  const accessToken = process.env.TIKTOK_EVENTS_API_ACCESS_TOKEN?.trim();
  const pixelId = process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID?.trim();
  if (!accessToken || !pixelId) return new NextResponse(null, { status: 204 });
  const raw = await request.text();
  if (raw.length > MAX_BODY_LENGTH) return NextResponse.json({ detail: 'Event too large.' }, { status: 413 });
  let input: unknown = null;
  try {
    input = JSON.parse(raw);
  } catch {
    // Rejected below.
  }
  const event = parseTiktokBrowserEvent(input);
  if (!event) return NextResponse.json({ detail: 'Invalid event.' }, { status: 400 });
  const body = tiktokEventsApiBody(pixelId, event, {
    eventTime: Math.floor(Date.now() / 1000),
    ip: clientIp(request.headers),
    userAgent: request.headers.get('user-agent'),
    ttp: request.cookies.get('_ttp')?.value,
  }, process.env.TIKTOK_EVENTS_API_TEST_CODE?.trim() || undefined);
  try {
    const response = await fetch(TIKTOK_EVENTS_API_URL, {
      method: 'POST',
      headers: { 'Access-Token': accessToken, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      cache: 'no-store',
      signal: AbortSignal.timeout(5_000),
    });
    const result = (await response.json().catch(() => null)) as { code?: unknown; message?: unknown } | null;
    if (!response.ok || result?.code !== 0) {
      console.warn('TikTok Events API rejected an event', {
        event: event.event,
        status: response.status,
        code: result?.code,
        message: typeof result?.message === 'string' ? result.message.slice(0, 200) : undefined,
      });
    }
  } catch (error) {
    console.warn('TikTok Events API request failed', { event: event.event, error: error instanceof Error ? error.name : 'unknown' });
  }
  return new NextResponse(null, { status: 204 });
}
