/**
 * Fan-out event tracking: GA4 (gtag), Meta Pixel (fbq), TikTok Pixel (ttq).
 * Step names use OnboardingScreenId.rcKey slugs to align with the app's
 * analytics taxonomy. Purchase conversions are fired from backend payment
 * webhooks, so do not fire purchase pixels here.
 */
type AnyWindow = Window & {
  gtag?: (...args: unknown[]) => void;
  fbq?: (...args: unknown[]) => void;
  ttq?: { track: (event: string, params?: Record<string, unknown>) => void };
};

export function trackEvent(name: string, params: Record<string, unknown> = {}): void {
  if (typeof window === 'undefined') return;
  const w = window as AnyWindow;
  try {
    w.gtag?.('event', name, params);
    w.fbq?.('trackCustom', name, params);
    w.ttq?.track(name, params);
  } catch {
    // Analytics must never break the funnel.
  }
}

/** One event per funnel step view; step = rcKey slug or page name. */
export function trackStepViewed(step: string): void {
  trackEvent('funnel_step_viewed', { step });
}
