/**
 * Fan-out event tracking: GA4 (gtag), Meta Pixel (fbq), TikTok Pixel (ttq).
 * Step names use OnboardingScreenId.rcKey slugs to align with the app's
 * analytics taxonomy.
 *
 * Meta Ads optimization uses standard events only (ViewContent / Lead /
 * InitiateCheckout / Purchase). Custom names still fire so GA4/TikTok keep
 * the funnel taxonomy. Do not name Meta custom conversions after health
 * conditions — use these standard events instead.
 */
import { getAttribution } from './attribution';

type AnyWindow = Window & {
  gtag?: (...args: unknown[]) => void;
  fbq?: (...args: unknown[]) => void;
  ttq?: { track: (event: string, params?: Record<string, unknown>) => void };
};

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

export function trackEvent(name: string, params: Record<string, unknown> = {}): void {
  if (typeof window === 'undefined') return;
  const w = window as AnyWindow;
  const payload = withAttribution(params);
  try {
    w.gtag?.('event', name, payload);
    w.fbq?.('trackCustom', name, payload);
    const standard = metaStandardEvent(name, payload);
    if (standard) w.fbq?.('track', standard.event, standard.params);
    w.ttq?.track(name, payload);
  } catch {
    // Analytics must never break the funnel.
  }
}

/** One event per funnel step view; step = rcKey slug or page name. */
export function trackStepViewed(step: string): void {
  trackEvent('funnel_step_viewed', { step });
}
