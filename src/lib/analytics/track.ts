/**
 * Fan-out event tracking: GA4 (gtag), Meta Pixel (fbq), TikTok Pixel (ttq).
 * Step names use OnboardingScreenId.rcKey slugs to align with the app's
 * analytics taxonomy.
 *
 * Meta Ads optimization uses four standard events only (ViewContent / Lead /
 * InitiateCheckout / Purchase). Quiz-step custom names stay on GA4 so they
 * cannot occupy Aggregated Event Measurement slots. Do not name Meta custom
 * conversions after health conditions.
 *
 * TikTok gets the same commercial steps as standard events (CompleteRegistration
 * at email capture, ViewContent on the paywall, AddToCart once per plan,
 * InitiateCheckout, Purchase) next to its custom names. Only standard events
 * feed optimization; custom names are kept for reporting. Quiz screens (age,
 * height, weight, ...) never reach TikTok, not even as custom names. TikTok
 * reads product ids from contents[].content_id; Meta's content_ids is ignored
 * there. Each standard event also goes to the Events API through our server
 * with the same event_id, so TikTok keeps one copy; it carries the hashed
 * email and lead id saved at email capture.
 */
import { isQuizStep } from '@/lib/quiz/steps';
import { getAttribution } from './attribution';
import {
  TIKTOK_EVENTS_PATH,
  tiktokPageUrl,
  type TiktokBrowserEvent,
  type TiktokProperties,
  type TiktokStandardEvent,
} from './tiktok-events-api';
import { applyTiktokIdentity, readTiktokIdentity, type TiktokIdentity, type TiktokPixel } from './tiktok-identity';

/** Plans already sent to TikTok as AddToCart in this tab. */
const TIKTOK_CART_KEY = 'nutree_tiktok_cart_v1';
/** TikTok item group for the paywall view, where no plan is chosen yet. Plans are its SKUs (package ids). */
const TIKTOK_PRODUCT_GROUP_ID = 'nutree_premium';

type AnyWindow = Window & {
  gtag?: (...args: unknown[]) => void;
  fbq?: (...args: unknown[]) => void;
  ttq?: TiktokPixel;
};

type TiktokStandard = { event: TiktokStandardEvent; params: TiktokProperties };

function withAttribution(params: Record<string, unknown>): Record<string, unknown> {
  return { ...getAttribution(), ...params };
}

function commerceParams(params: Record<string, unknown>): Record<string, unknown> {
  const plan = typeof params.plan === 'string' ? params.plan : null;
  const value = typeof params.value === 'number' ? params.value : null;
  const currency = typeof params.currency === 'string' ? params.currency : null;
  return {
    ...(value != null ? { value } : {}),
    ...(currency ? { currency } : {}),
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

function metaStandardEvent(
  name: string,
  params: Record<string, unknown>,
): { event: string; params: Record<string, unknown> } | null {
  if (name === 'email_captured') return { event: 'Lead', params: { content_name: 'email_capture' } };
  if (name === 'funnel_step_viewed' && params.step === 'landing') {
    return { event: 'ViewContent', params: { content_name: 'funnel_landing', content_category: 'onboarding' } };
  }
  if (name === 'revenuecat_checkout_started') {
    return { event: 'InitiateCheckout', params: commerceParams(params) };
  }
  if (name === 'revenuecat_checkout_completed') {
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
  if (name === 'revenuecat_checkout_completed') {
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
  const value = typeof params.value === 'number' ? params.value : null;
  const currency = typeof params.currency === 'string' ? params.currency : null;
  return {
    ...(value != null ? { value } : {}),
    ...(currency ? { currency } : {}),
    content_type: 'product' as const,
    ...(id ? { contents: [{ content_id: id, quantity: 1, ...(value != null ? { price: value } : {}) }] } : {}),
  };
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
  const url = tiktokPageUrl(window.location?.href);
  const referrer = tiktokPageUrl(typeof document === 'undefined' ? undefined : document.referrer);
  return { ...(url ? { url } : {}), ...(referrer ? { referrer } : {}) };
}

function trackTiktok(ttq: TiktokPixel | undefined, name: string, payload: Record<string, unknown>): void {
  if (isQuizStepView(name, payload)) return;
  // The server copy also covers pixels that have not loaded yet or are blocked.
  const serverCopy = Boolean(process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID) && typeof fetch === 'function';
  if (!ttq && !serverCopy) return;
  const identity = readTiktokIdentity();
  applyTiktokIdentity(ttq, identity);
  ttq?.track(name, payload);
  for (const { event, params } of tiktokStandardEvents(name, payload)) {
    const id = eventID(event);
    ttq?.track(event, params, { event_id: id });
    if (serverCopy) {
      sendTiktokServerEvent({ event, event_id: id, properties: params, user: tiktokUser(identity, payload), page: tiktokPage() });
    }
  }
}

/** Unique per event: TikTok drops later events that reuse an event_id. */
function eventID(event: string): string {
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
    const standard = metaStandardEvent(name, payload);
    if (standard) w.fbq?.('track', standard.event, standard.params, { eventID: eventID(standard.event) });
    trackTiktok(w.ttq, name, payload);
  } catch {
    // Analytics must never break the funnel.
  }
}

/** One event per funnel step view; step = rcKey slug or page name. */
export function trackStepViewed(step: string): void {
  trackEvent('funnel_step_viewed', { step });
}
