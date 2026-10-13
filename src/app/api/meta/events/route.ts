import { NextRequest, NextResponse } from 'next/server';
import { isSameOriginMutation } from '@/lib/handoff/lead-access-session';
import { clientIp, isRecord } from '@/lib/analytics/events-api';
import { metaEventsApiBody, metaEventsApiUrl, parseMetaBrowserEvent } from '@/lib/analytics/meta-events-api';
import { metaPixelId } from '@/lib/analytics/meta-identity';

export const dynamic = 'force-dynamic';

/** Browser bodies are under 2 KB. */
const MAX_BODY_LENGTH = 16_384;

function short(value: unknown): string | undefined {
  return typeof value === 'string' ? value.slice(0, 200) : undefined;
}

/**
 * Forwards the browser's Meta standard events to the Conversions API with the
 * pixel's eventID, adding IP, user agent and the _fbp / _fbc cookies. Inert
 * (204) until META_CONVERSIONS_API_ACCESS_TOKEN is set. Delivery failures are
 * logged without user data and never surface to the funnel.
 */
export async function POST(request: NextRequest) {
  if (!isSameOriginMutation(request.headers, request.nextUrl.origin)) return NextResponse.json({ detail: 'Cross-site mutation rejected.' }, { status: 403 });
  const accessToken = process.env.META_CONVERSIONS_API_ACCESS_TOKEN?.trim();
  const pixelId = metaPixelId();
  if (!accessToken || !pixelId) return new NextResponse(null, { status: 204 });
  const raw = await request.text();
  if (raw.length > MAX_BODY_LENGTH) return NextResponse.json({ detail: 'Event too large.' }, { status: 413 });
  let input: unknown = null;
  try {
    input = JSON.parse(raw);
  } catch {
    // Rejected below.
  }
  const event = parseMetaBrowserEvent(input);
  if (!event) return NextResponse.json({ detail: 'Invalid event.' }, { status: 400 });
  const body = metaEventsApiBody(event, {
    eventTime: Math.floor(Date.now() / 1000),
    ip: clientIp(request.headers),
    userAgent: request.headers.get('user-agent'),
    fbp: request.cookies.get('_fbp')?.value,
    fbc: request.cookies.get('_fbc')?.value,
  }, process.env.META_CONVERSIONS_API_TEST_EVENT_CODE?.trim() || undefined);
  try {
    // A header keeps the token out of URLs, which proxies and error traces record.
    const response = await fetch(metaEventsApiUrl(pixelId), {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      cache: 'no-store',
      signal: AbortSignal.timeout(5_000),
    });
    const result = (await response.json().catch(() => null)) as { events_received?: unknown; error?: unknown; fbtrace_id?: unknown } | null;
    if (!response.ok || result?.events_received !== 1) {
      // error_user_msg can quote the rejected parameter value, so it is not logged.
      const error = isRecord(result?.error) ? result.error : {};
      console.warn('Meta Conversions API rejected an event', {
        event: event.event_name,
        status: response.status,
        code: error.code,
        subcode: error.error_subcode,
        title: short(error.error_user_title),
        message: short(error.message),
        trace: short(error.fbtrace_id ?? result?.fbtrace_id),
      });
    }
  } catch (error) {
    console.warn('Meta Conversions API request failed', { event: event.event_name, error: error instanceof Error ? error.name : 'unknown' });
  }
  return new NextResponse(null, { status: 204 });
}
