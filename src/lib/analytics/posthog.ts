import posthog from 'posthog-js';
import { funnelName, type FunnelLocale } from './funnel-locale';

/** Super properties that split every later event by funnel language. */
export function registerFunnelSuperProperties(locale: FunnelLocale): void {
  try {
    posthog.register({
      funnel_locale: locale,
      funnel: funnelName(locale),
    });
  } catch {
    // Analytics must never block the funnel.
  }
}

/** Mirror a funnel event into PostHog so the quiz and checkout show up on the session. */
export function captureFunnelEvent(name: string, properties: Record<string, unknown> = {}): void {
  try {
    posthog.capture(name, properties);
  } catch {
    // Analytics must never block checkout.
  }
}

/** Attach the anonymous replay to the lead once checkout identity exists. */
export function identifyFunnelLead(leadId: string, email?: string | null) {
  if (!leadId) return;
  posthog.identify(leadId, {
    source: 'web_funnel',
    ...(email ? { email } : {}),
  });
}
