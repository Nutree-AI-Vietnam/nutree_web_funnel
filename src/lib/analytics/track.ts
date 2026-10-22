/**
 * Fan-out event tracking: GA4 (gtag), Meta Pixel (fbq), TikTok Pixel (ttq).
 * Step names use OnboardingScreenId.rcKey slugs to align with the app's
 * analytics taxonomy.
 *
 * Meta Ads optimization uses four standard events only (ViewContent / Lead /
 * InitiateCheckout / Purchase). Quiz-step custom names stay on GA4 so they
 * cannot occupy Aggregated Event Measurement slots. Do not name Meta custom
 * conversions after health conditions. Each of the four also goes to the
 * Conversions API through our server with the pixel's eventID, so Meta keeps
 * one copy; it carries the hashed email, first name and lead id saved at email
 * capture, an fbc built from the landing fbclid, and the funnel locale that
 * selects the dataset. The funnel entry sends
 * ViewContent once per tab: on the landing step when that screen is shown,
 * otherwise on the goal step. Ad optimization uses the ViewContent event.
 *
 * TikTok gets the same commercial steps as standard events (CompleteRegistration
 * at email capture, ViewContent on the paywall, AddToCart once per plan,
 * InitiateCheckout, Purchase) next to its custom names. A paid MoMo pass is a
 * Purchase on both platforms, like a card checkout; its event id is fixed per
 * order (Purchase.momo.<order id>), so within their 48-hour dedupe window both
 * platforms drop a repeat of that order from another tab or a later server
 * copy. Only standard events feed optimization; custom names are kept for
 * reporting. Quiz screens (age, height, weight, ...) never reach TikTok, not
 * even as custom names. TikTok
 * reads product ids from contents[].content_id; Meta's content_ids is ignored
 * there. Each standard event also goes to the Events API through our server
 * with the same event_id, so TikTok keeps one copy; it carries the hashed
 * email and lead id saved at email capture.
 *
 * Both pixels and both server copies run only on quiz.nutreeai.com (see
 * ad-pixel-host), so preview and local traffic stays out of the live datasets.
 */
import { MOMO_ORDER_ID } from '@/lib/payments/momo-checkout';
import { isQuizStep } from '@/lib/quiz/steps';
import { isAdPixelHost } from './ad-pixel-host';
import { getAttribution } from './attribution';
import { pageUrl } from './events-api';
import { META_EVENTS_PATH, type MetaBrowserEvent, type MetaCustomData, type MetaStandardEvent } from './meta-events-api';
import { readLockedFunnelLocale } from './funnel-locale';
import { activeMetaPixelId, hashMetaIdentity, readMetaIdentity } from './meta-identity';
import { TIKTOK_EVENTS_PATH, type TiktokBrowserEvent, type TiktokProperties, type TiktokStandardEvent } from './tiktok-events-api';
import { captureFunnelEvent } from './posthog';
import { applyTiktokIdentity, readTiktokIdentity, type TiktokIdentity, type TiktokPixel } from './tiktok-identity';

/** The landing fbclid and when this tab first saw it. */
const META_CLICK_KEY = 'nutree_meta_click_v1';
/** The tab already sent the funnel-entry ViewContent (landing or goal). */
const META_ENTRY_VIEW_KEY = 'nutree_meta_entry_view_v1';
/** Plans already sent to TikTok as AddToCart in this tab. */
const TIKTOK_CART_KEY = 'nutree_tiktok_cart_v1';
/** TikTok item group for the paywall view, where no plan is chosen yet. Plans are its SKUs (package ids). */
const TIKTOK_PRODUCT_GROUP_ID = 'nutree_premium';

type AnyWindow = Window & {
  gtag?: (...args: unknown[]) => void;
  fbq?: (...args: unknown[]) => void;
  ttq?: TiktokPixel;
};

type MetaStandard = { event: MetaStandardEvent; params: MetaCustomData };
type TiktokStandard = { event: TiktokStandardEvent; params: TiktokProperties };

function withAttribution(params: Record<string, unknown>): Record<string, unknown> {
  return { ...getAttribution(), ...params };
}

/** Value with its currency, or neither: Meta and TikTok take only a value above 0 with an ISO 4217 code. */
function commerceValue(params: Record<string, unknown>): { value: number; currency: string } | null {
  const { value, currency } = params;
  return typeof value === 'number' && Number.isFinite(value) && value > 0 && typeof currency === 'string' && /^[A-Z]{3}$/.test(currency)
    ? { value, currency }
    : null;
}

function commerceParams(params: Record<string, unknown>): MetaCustomData {
  const plan = typeof params.plan === 'string' ? params.plan : null;
  return {
    ...commerceValue(params),
    content_type: 'product',
    num_items: 1,
    ...(plan
      ? {
          content_ids: [plan],
          content_name: plan,
          contents: [{ id: plan, quantity: 1 }],
        }
      : {}),
  };
}

/** First landing or goal view in this tab wins, so the entry event is not sent twice. */
function claimFunnelEntryView(step: string): boolean {
  try {
    if (window.sessionStorage.getItem(META_ENTRY_VIEW_KEY)) return false;
    window.sessionStorage.setItem(META_ENTRY_VIEW_KEY, step);
    return true;
  } catch {
    // Without session storage the event is still sent.
    return true;
  }
}

/** Card (RevenueCat) and MoMo pass purchases both count as an ad Purchase. */
function isCompletedPurchase(name: string): boolean {
  return name === 'revenuecat_checkout_completed' || name === 'momo_checkout_completed';
}

function metaStandardEvent(name: string, params: Record<string, unknown>): MetaStandard | null {
  if (name === 'email_captured') return { event: 'Lead', params: { content_name: 'email_capture' } };
  if (name === 'funnel_step_viewed' && (params.step === 'landing' || params.step === 'goal')) {
    const step = String(params.step);
    if (!claimFunnelEntryView(step)) return null;
    return {
      event: 'ViewContent',
      params: {
        content_name: step === 'goal' ? 'funnel_quiz_start' : 'funnel_landing',
        content_category: 'onboarding',
      },
    };
  }
  if (name === 'revenuecat_checkout_started') {
    return { event: 'InitiateCheckout', params: commerceParams(params) };
  }
  if (isCompletedPurchase(name)) {
    return { event: 'Purchase', params: commerceParams(params) };
  }
  return null;
}

/** Quiz screens collect body and health details, so their names stay off TikTok. */
function isQuizStepView(name: string, params: Record<string, unknown>): boolean {
  return name === 'funnel_step_viewed' && typeof params.step === 'string' && isQuizStep(params.step);
}

function tiktokStandardEvents(name: string, params: Record<string, unknown>): TiktokStandard[] {
  if (name === 'email_captured') return [{ event: 'CompleteRegistration', params: tiktokProductGroupParams() }];
  if (name === 'funnel_step_viewed' && params.step === 'paywall') {
    return [{ event: 'ViewContent', params: tiktokProductGroupParams() }];
  }
  if (name === 'offer_selected') {
    return addToTiktokCart(params.offer_id)
      ? [{ event: 'AddToCart', params: tiktokProductParams(params, params.offer_id) }]
      : [];
  }
  if (name === 'revenuecat_checkout_started') {
    const product = tiktokProductParams(params, params.plan);
    const checkout: TiktokStandard = { event: 'InitiateCheckout', params: product };
    // Keeping the preselected plan never fires offer_selected, so its AddToCart is sent here.
    return addToTiktokCart(params.plan) ? [{ event: 'AddToCart', params: product }, checkout] : [checkout];
  }
  if (isCompletedPurchase(name)) {
    return [{ event: 'Purchase', params: tiktokProductParams(params, params.plan) }];
  }
  return [];
}

/** Records the plan and returns true the first time it reaches the cart in this tab. */
function addToTiktokCart(productId: unknown): boolean {
  if (typeof productId !== 'string' || !productId) return true;
  try {
    const stored = JSON.parse(window.sessionStorage.getItem(TIKTOK_CART_KEY) ?? '[]') as unknown;
    const cart = Array.isArray(stored) ? stored : [];
    if (cart.includes(productId)) return false;
    window.sessionStorage.setItem(TIKTOK_CART_KEY, JSON.stringify([...cart, productId]));
  } catch {
    // Without session storage every selection is sent, as before.
  }
  return true;
}

function tiktokProductGroupParams(): TiktokProperties {
  return { content_type: 'product_group', contents: [{ content_id: TIKTOK_PRODUCT_GROUP_ID }] };
}

function tiktokProductParams(params: Record<string, unknown>, productId: unknown): TiktokProperties {
  const id = typeof productId === 'string' && productId ? productId : null;
  const commerce = commerceValue(params);
  return {
    ...commerce,
    content_type: 'product' as const,
    ...(id ? { contents: [{ content_id: id, quantity: 1, ...(commerce ? { price: commerce.value } : {}) }] } : {}),
  };
}

/**
 * fbc for the landing fbclid, kept whole: Meta matches the click id exactly.
 * The creation time is when this tab first saw that click.
 */
function metaFbc(fbclid: unknown): string | null {
  if (typeof fbclid !== 'string' || !fbclid) return null;
  let seenAt = Date.now();
  try {
    const stored = JSON.parse(window.sessionStorage.getItem(META_CLICK_KEY) ?? 'null') as { fbclid?: unknown; seen_at?: unknown } | null;
    if (stored?.fbclid === fbclid && typeof stored.seen_at === 'number') seenAt = stored.seen_at;
    else window.sessionStorage.setItem(META_CLICK_KEY, JSON.stringify({ fbclid, seen_at: seenAt }));
  } catch {
    // Without session storage each event dates the click itself.
  }
  return `fb.1.${seenAt}.${fbclid}`;
}

/** Server copy of a pixel event; the shared event_id lets Meta keep only one. Locale picks the paired dataset. */
function sendMetaServerEvent(event: Omit<MetaBrowserEvent, 'user_data'>, fbc: string | null): void {
  const locale = readLockedFunnelLocale();
  try {
    void hashMetaIdentity(readMetaIdentity())
      .then((identity) => fetch(META_EVENTS_PATH, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...event, locale, user_data: { ...identity, ...(fbc ? { fbc } : {}) } }),
        keepalive: true,
      }))
      .catch(() => undefined);
  } catch {
    // The pixel already has the event.
  }
}

function trackMeta(fbq: AnyWindow['fbq'], name: string, payload: Record<string, unknown>): void {
  const standard = metaStandardEvent(name, payload);
  if (!standard) return;
  const id = eventID(standard.event, fixedEventKey(name, payload));
  fbq?.('track', standard.event, standard.params, { eventID: id });
  // The server copy also covers pixels that have not loaded yet or are blocked.
  if (!isAdPixelHost() || !activeMetaPixelId() || typeof fetch !== 'function') return;
  const url = pageUrl(window.location?.href);
  sendMetaServerEvent(
    { event_name: standard.event, event_id: id, ...(url ? { event_source_url: url } : {}), custom_data: standard.params },
    metaFbc(payload.fbclid),
  );
}

/** Server copy of a pixel event; the shared event_id lets TikTok keep only one. */
function sendTiktokServerEvent(event: TiktokBrowserEvent): void {
  try {
    void fetch(TIKTOK_EVENTS_PATH, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
      keepalive: true,
    }).catch(() => undefined);
  } catch {
    // The pixel already has the event.
  }
}

function tiktokUser(identity: TiktokIdentity | null, payload: Record<string, unknown>): TiktokBrowserEvent['user'] {
  const ttclid = typeof payload.ttclid === 'string' && payload.ttclid ? payload.ttclid : null;
  return { ...identity, ...(ttclid ? { ttclid } : {}) };
}

function tiktokPage(): TiktokBrowserEvent['page'] {
  const url = pageUrl(window.location?.href);
  const referrer = pageUrl(typeof document === 'undefined' ? undefined : document.referrer);
  return { ...(url ? { url } : {}), ...(referrer ? { referrer } : {}) };
}

function trackTiktok(ttq: TiktokPixel | undefined, name: string, payload: Record<string, unknown>): void {
  if (isQuizStepView(name, payload)) return;
  // The server copy also covers pixels that have not loaded yet or are blocked.
  const serverCopy = Boolean(process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID) && isAdPixelHost() && typeof fetch === 'function';
  if (!ttq && !serverCopy) return;
  const identity = readTiktokIdentity();
  applyTiktokIdentity(ttq, identity);
  ttq?.track(name, payload);
  const key = fixedEventKey(name, payload);
  for (const { event, params } of tiktokStandardEvents(name, payload)) {
    const id = eventID(event, key);
    ttq?.track(event, params, { event_id: id });
    if (serverCopy) {
      sendTiktokServerEvent({ event, event_id: id, properties: params, user: tiktokUser(identity, payload), page: tiktokPage() });
    }
  }
}

/**
 * A paid MoMo order is one purchase however many pages report it, so its id
 * comes from the order. Anything else that should count once per occurrence
 * gets no key.
 */
function fixedEventKey(name: string, params: Record<string, unknown>): string | null {
  const orderId = params.order_id;
  return name === 'momo_checkout_completed' && typeof orderId === 'string' && MOMO_ORDER_ID.test(orderId) ? `momo.${orderId}` : null;
}

/**
 * Unique per event unless a fixed key is given: TikTok drops later events that
 * reuse an event_id, and Meta keeps one pixel or server copy per event_id.
 */
function eventID(event: string, key: string | null = null): string {
  if (key) return `${event}.${key}`;
  const uuid = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
  return `${event}.${uuid}`;
}

export function trackEvent(name: string, params: Record<string, unknown> = {}): void {
  if (typeof window === 'undefined') return;
  const w = window as AnyWindow;
  const payload = withAttribution(params);
  try {
    w.gtag?.('event', name, payload);
    trackMeta(w.fbq, name, payload);
    trackTiktok(w.ttq, name, payload);
    captureFunnelEvent(name, payload);
  } catch {
    // Analytics must never break the funnel.
  }
}

/** One event per funnel step view; step = rcKey slug or page name. */
export function trackStepViewed(step: string): void {
  trackEvent('funnel_step_viewed', { step });
}
