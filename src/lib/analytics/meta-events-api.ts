/**
 * Meta Conversions API copy of the pixel's standard events.
 *
 * The browser posts each standard event to META_EVENTS_PATH with the eventID it
 * gave the pixel; Meta keeps one of the two (same pixel, event name and event_id
 * within 48 hours). The server adds what the browser cannot send reliably: IP,
 * user agent and the _fbp / _fbc cookies. Email, first name and lead id arrive
 * as SHA-256 hashes only, and page URLs are cut to origin + path.
 */
import { IP, isRecord, OPAQUE, pageUrl, SHA256_HEX, text, TOKEN } from './events-api';

export const META_EVENTS_PATH = '/api/meta/events';
/** Graph API versions expire about two years after release; v26.0 shipped in July 2026. */
const GRAPH_API_VERSION = 'v26.0';

export function metaEventsApiUrl(pixelId: string): string {
  return `https://graph.facebook.com/${GRAPH_API_VERSION}/${pixelId}/events`;
}

const STANDARD_EVENTS = ['ViewContent', 'Lead', 'AddToCart', 'InitiateCheckout', 'Purchase'] as const;
/** Custom events: the pixel sends them with trackCustom. PaywallView marks where people stop between Lead and checkout. */
export const CUSTOM_EVENTS = ['PaywallView'] as const;
export type MetaStandardEvent = (typeof STANDARD_EVENTS)[number] | (typeof CUSTOM_EVENTS)[number];

export type MetaContent = { id: string; quantity?: number };

export type MetaCustomData = {
  value?: number;
  currency?: string;
  content_ids?: string[];
  content_name?: string;
  content_category?: string;
  content_type?: 'product';
  contents?: MetaContent[];
  num_items?: number;
};

/** Body the browser posts to META_EVENTS_PATH. */
export type MetaBrowserEvent = {
  event_name: MetaStandardEvent;
  event_id: string;
  event_source_url?: string;
  custom_data: MetaCustomData;
  /** SHA-256 hex of the email, first name and lead id; fbc built from the landing fbclid. */
  user_data: { em?: string; fn?: string; external_id?: string; fbc?: string };
};

/** What only the server knows about the request. */
export type MetaRequestContext = {
  eventTime: number;
  ip?: string | null;
  userAgent?: string | null;
  fbp?: string | null;
  fbc?: string | null;
};

/** fb.<subdomain index>.<creation time>.<value>, as the pixel writes _fbp and _fbc. */
const FB_COOKIE = /^fb\.\d+\.\d+\.[!-~]+$/;
/** Click ids run up to 1,000 characters (see attribution.ts); a cut one matches no ad. */
const MAX_FBC_LENGTH = 1100;
const MAX_FBP_LENGTH = 256;

function contentIds(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const ids = value.slice(0, 10).flatMap((item) => text(item, 100) ?? []);
  return ids.length ? ids : undefined;
}

function contents(value: unknown): MetaContent[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const items = value.slice(0, 10).flatMap((item): MetaContent[] => {
    if (!isRecord(item)) return [];
    const id = text(item.id, 100);
    if (!id) return [];
    const quantity = typeof item.quantity === 'number' && Number.isInteger(item.quantity) && item.quantity > 0 ? item.quantity : undefined;
    return [{ id, ...(quantity ? { quantity } : {}) }];
  });
  return items.length ? items : undefined;
}

function customData(value: unknown): MetaCustomData {
  if (!isRecord(value)) return {};
  const result: MetaCustomData = {};
  // Meta takes a value above 0 with an ISO 4217 code; anything else is dropped as a pair.
  const currency = text(value.currency, 3, /^[A-Z]{3}$/);
  if (typeof value.value === 'number' && Number.isFinite(value.value) && value.value > 0 && currency) {
    result.value = value.value;
    result.currency = currency;
  }
  const ids = contentIds(value.content_ids);
  if (ids) result.content_ids = ids;
  const name = text(value.content_name, 100);
  if (name) result.content_name = name;
  const category = text(value.content_category, 100);
  if (category) result.content_category = category;
  if (value.content_type === 'product') result.content_type = 'product';
  const items = contents(value.contents);
  if (items) result.contents = items;
  if (typeof value.num_items === 'number' && Number.isInteger(value.num_items) && value.num_items > 0) result.num_items = value.num_items;
  return result;
}

function fbCookie(value: unknown, maxLength: number): string | undefined {
  const cookie = text(value, maxLength, OPAQUE);
  return cookie && FB_COOKIE.test(cookie) ? cookie : undefined;
}

/** Validates the browser body; null for anything that is not one of our standard or custom events. */
export function parseMetaBrowserEvent(input: unknown): MetaBrowserEvent | null {
  if (!isRecord(input)) return null;
  const eventName = [...STANDARD_EVENTS, ...CUSTOM_EVENTS].find((name) => name === input.event_name);
  const eventId = text(input.event_id, 128, TOKEN);
  if (!eventName || !eventId) return null;
  const user = isRecord(input.user_data) ? input.user_data : {};
  const em = text(user.em, 64, SHA256_HEX);
  const fn = text(user.fn, 64, SHA256_HEX);
  const externalId = text(user.external_id, 64, SHA256_HEX);
  const fbc = fbCookie(user.fbc, MAX_FBC_LENGTH);
  const url = pageUrl(input.event_source_url);
  return {
    event_name: eventName,
    event_id: eventId,
    ...(url ? { event_source_url: url } : {}),
    custom_data: customData(input.custom_data),
    user_data: {
      ...(em ? { em } : {}),
      ...(fn ? { fn } : {}),
      ...(externalId ? { external_id: externalId } : {}),
      ...(fbc ? { fbc } : {}),
    },
  };
}

/**
 * The pixel's _fbc cookie, unless the browser reports a different click: its
 * fbclid comes from this tab's landing URL, so it is the latest one.
 */
export function pickFbc(cookie: string | undefined, browser: string | undefined): string | undefined {
  if (!cookie || !browser) return cookie ?? browser;
  // The pixel may append its own segment after the fbclid.
  const click = (fbc: string) => `${fbc.split('.').slice(3).join('.')}.`;
  return click(cookie).startsWith(click(browser)) ? cookie : browser;
}

export function metaEventsApiBody(event: MetaBrowserEvent, context: MetaRequestContext) {
  const { em, fn, external_id: externalId } = event.user_data;
  const ip = text(context.ip, 45, IP);
  const userAgent = text(context.userAgent, 1024);
  const fbp = fbCookie(context.fbp, MAX_FBP_LENGTH);
  const fbc = pickFbc(fbCookie(context.fbc, MAX_FBC_LENGTH), event.user_data.fbc);
  return {
    data: [{
      event_name: event.event_name,
      event_time: context.eventTime,
      event_id: event.event_id,
      action_source: 'website',
      ...(event.event_source_url ? { event_source_url: event.event_source_url } : {}),
      user_data: {
        ...(em ? { em: [em] } : {}),
        ...(fn ? { fn: [fn] } : {}),
        ...(externalId ? { external_id: [externalId] } : {}),
        ...(ip ? { client_ip_address: ip } : {}),
        ...(userAgent ? { client_user_agent: userAgent } : {}),
        ...(fbp ? { fbp } : {}),
        ...(fbc ? { fbc } : {}),
      },
      ...(Object.keys(event.custom_data).length ? { custom_data: event.custom_data } : {}),
    }],
  };
}
