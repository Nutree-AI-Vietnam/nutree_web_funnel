/**
 * TikTok Events API copy of the pixel's standard events.
 *
 * The browser posts each standard event to TIKTOK_EVENTS_PATH with the event_id
 * it gave the pixel; TikTok keeps one of the two (same pixel, event name and
 * event_id within 48 hours). The server adds what the browser cannot send
 * reliably: IP, user agent and the _ttp cookie. Email and lead id arrive as
 * SHA-256 hashes only, and page URLs are cut to origin + path.
 */

export const TIKTOK_EVENTS_PATH = '/api/tiktok/events';
export const TIKTOK_EVENTS_API_URL = 'https://business-api.tiktok.com/open_api/v1.3/event/track/';

const STANDARD_EVENTS = ['ViewContent', 'AddToCart', 'InitiateCheckout', 'Purchase', 'CompleteRegistration'] as const;
export type TiktokStandardEvent = (typeof STANDARD_EVENTS)[number];

export type TiktokContent = { content_id: string; quantity?: number; price?: number };

export type TiktokProperties = {
  value?: number;
  currency?: string;
  content_type?: 'product' | 'product_group';
  contents?: TiktokContent[];
};

/** Body the browser posts to TIKTOK_EVENTS_PATH. */
export type TiktokBrowserEvent = {
  event: TiktokStandardEvent;
  event_id: string;
  properties: TiktokProperties;
  user: { email?: string; external_id?: string; ttclid?: string };
  page: { url?: string; referrer?: string };
};

/** What only the server knows about the request. */
export type TiktokRequestContext = {
  eventTime: number;
  ip?: string | null;
  userAgent?: string | null;
  ttp?: string | null;
};

const SHA256_HEX = /^[0-9a-f]{64}$/;
/** Event ids we generate. */
const TOKEN = /^[\w.~-]+$/;
/** Click ids and cookie values are opaque; any visible ASCII, no spaces. */
const OPAQUE = /^[!-~]+$/;
const IP = /^[0-9a-fA-F:.]{3,45}$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function text(value: unknown, maxLength: number, pattern?: RegExp): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > maxLength) return undefined;
  return !pattern || pattern.test(trimmed) ? trimmed : undefined;
}

function amount(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : undefined;
}

/** Origin + path only: query strings and fragments can carry tokens. */
export function tiktokPageUrl(value: unknown): string | undefined {
  const url = text(value, 2048);
  if (!url) return undefined;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? `${parsed.origin}${parsed.pathname}` : undefined;
  } catch {
    return undefined;
  }
}

function contents(value: unknown): TiktokContent[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const items = value.slice(0, 10).flatMap((item): TiktokContent[] => {
    if (!isRecord(item)) return [];
    const contentId = text(item.content_id, 100);
    if (!contentId) return [];
    const quantity = typeof item.quantity === 'number' && Number.isInteger(item.quantity) && item.quantity > 0 ? item.quantity : undefined;
    const price = amount(item.price);
    return [{ content_id: contentId, ...(quantity ? { quantity } : {}), ...(price !== undefined ? { price } : {}) }];
  });
  return items.length ? items : undefined;
}

function properties(value: unknown): TiktokProperties {
  if (!isRecord(value)) return {};
  const result: TiktokProperties = {};
  const eventValue = amount(value.value);
  const currency = text(value.currency, 3, /^[A-Z]{3}$/);
  if (eventValue !== undefined && currency) {
    result.value = eventValue;
    result.currency = currency;
  }
  if (value.content_type === 'product' || value.content_type === 'product_group') result.content_type = value.content_type;
  const items = contents(value.contents);
  if (items) result.contents = items;
  return result;
}

/** Validates the browser body; null for anything that is not one of our standard events. */
export function parseTiktokBrowserEvent(input: unknown): TiktokBrowserEvent | null {
  if (!isRecord(input)) return null;
  const event = STANDARD_EVENTS.find((name) => name === input.event);
  const eventId = text(input.event_id, 128, TOKEN);
  if (!event || !eventId) return null;
  const user = isRecord(input.user) ? input.user : {};
  const page = isRecord(input.page) ? input.page : {};
  const email = text(user.email, 64, SHA256_HEX);
  const externalId = text(user.external_id, 64, SHA256_HEX);
  // TikTok click IDs run up to 1,000 characters; a cut one no longer matches its ad.
  const ttclid = text(user.ttclid, 1000, OPAQUE);
  const url = tiktokPageUrl(page.url);
  const referrer = tiktokPageUrl(page.referrer);
  return {
    event,
    event_id: eventId,
    properties: properties(input.properties),
    user: {
      ...(email ? { email } : {}),
      ...(externalId ? { external_id: externalId } : {}),
      ...(ttclid ? { ttclid } : {}),
    },
    page: {
      ...(url ? { url } : {}),
      ...(referrer ? { referrer } : {}),
    },
  };
}

/** First hop of x-forwarded-for, which Vercel sets to the client address. */
export function clientIp(headers: Headers): string | null {
  const ip = headers.get('x-forwarded-for')?.split(',')[0]?.trim() || headers.get('x-real-ip')?.trim();
  return ip && IP.test(ip) ? ip : null;
}

export function tiktokEventsApiBody(pixelId: string, event: TiktokBrowserEvent, context: TiktokRequestContext, testEventCode?: string) {
  const ttp = text(context.ttp, 256, OPAQUE);
  const userAgent = text(context.userAgent, 1024);
  const ip = text(context.ip, 45, IP);
  return {
    event_source: 'web',
    event_source_id: pixelId,
    ...(testEventCode ? { test_event_code: testEventCode } : {}),
    data: [{
      event: event.event,
      event_time: context.eventTime,
      event_id: event.event_id,
      user: {
        ...event.user,
        ...(ttp ? { ttp } : {}),
        ...(ip ? { ip } : {}),
        ...(userAgent ? { user_agent: userAgent } : {}),
      },
      ...(Object.keys(event.page).length ? { page: event.page } : {}),
      properties: event.properties,
    }],
  };
}
