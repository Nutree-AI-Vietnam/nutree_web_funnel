import { NextRequest, NextResponse } from 'next/server';
import { isSameOriginMutation } from '@/lib/handoff/lead-access-session';
import { isAdPixelHost, isProductionDeployment } from '@/lib/analytics/ad-pixel-host';
import { clientIp, isRecord } from '@/lib/analytics/events-api';
import { isFunnelLocale, type FunnelLocale } from '@/lib/analytics/funnel-locale';
import { metaDatasetForLocale } from '@/lib/analytics/meta-dataset';
import { metaEventsApiBody, metaEventsApiUrl, parseMetaBrowserEvent } from '@/lib/analytics/meta-events-api';

export const dynamic = 'force-dynamic';

/** Browser bodies are under 2 KB. */
const MAX_BODY_LENGTH = 16_384;

function short(value: unknown): string | undefined {
  return typeof value === 'string' ? value.slice(0, 200) : undefined;
}

/** Old bundles omit locale. A value that is present but not allowed is rejected. */
function funnelLocaleFromEvent(input: unknown): FunnelLocale | null {
  if (!isRecord(input) || !Object.hasOwn(input, 'locale')) return 'vi';
  return isFunnelLocale(input.locale) ? input.locale : null;
}

/**
 * Forwards the browser's Meta standard events to the Conversions API with the
 * pixel's eventID, adding IP, user agent and the _fbp / _fbc cookies. The
 * browser sends a locale (`vi` or `en`); the pixel id and token are chosen
 * here. A missing locale is Vietnamese so a tab still on the previous bundle
 * keeps its server events. English is used only when its pixel and token are
 * both set; otherwise the Vietnamese pair is used. Inert (204) until the
 * chosen access token is set, and anywhere but the production deployment on
 * quiz.nutreeai.com. Delivery failures are logged without user data and never
 * surface to the funnel.
 */
export async function POST(request: NextRequest) {
  if (!isSameOriginMutation(request.headers, request.nextUrl.origin)) return NextResponse.json({ detail: 'Cross-site mutation rejected.' }, { status: 403 });
  const raw = await request.text();
  if (raw.length > MAX_BODY_LENGTH) return NextResponse.json({ detail: 'Event too large.' }, { status: 413 });
  let input: unknown = null;
  try {
    input = JSON.parse(raw);
  } catch {
    // Rejected below.
  }
  const locale = funnelLocaleFromEvent(input);
  if (!locale) return NextResponse.json({ detail: 'Invalid locale.' }, { status: 400 });
  const event = parseMetaBrowserEvent(input);
  if (!event) return NextResponse.json({ detail: 'Invalid event.' }, { status: 400 });
  const dataset = metaDatasetForLocale(locale);
  if (!dataset.accessToken || !dataset.pixelId) return new NextResponse(null, { status: 204 });
  // Only the production deployment on the live quiz host forwards, so previews,
  // vercel.app URLs and local builds never reach the live dataset.
  if (!isProductionDeployment() || !isAdPixelHost(request.nextUrl.hostname)) return new NextResponse(null, { status: 204 });
  const body = metaEventsApiBody(event, {
    eventTime: Math.floor(Date.now() / 1000),
    ip: clientIp(request.headers),
    userAgent: request.headers.get('user-agent'),
    fbp: request.cookies.get('_fbp')?.value,
    fbc: request.cookies.get('_fbc')?.value,
  });
  try {
    // A header keeps the token out of URLs, which proxies and error traces record.
    const response = await fetch(metaEventsApiUrl(dataset.pixelId), {
      method: 'POST',
      headers: { Authorization: `Bearer ${dataset.accessToken}`, 'Content-Type': 'application/json' },
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
