import posthog from 'posthog-js';
import {
  analyticsLocale,
  carriesStoredFunnelLocale,
  funnelName,
  isFunnelLocale,
  rememberFunnelLocale,
  surveyLocaleFromPath,
  type FunnelLocale,
} from './funnel-locale';

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

/** Locale already stored as a PostHog super property, once persistence is readable. */
export function readRegisteredFunnelLocale(): FunnelLocale | null {
  try {
    const value = posthog.get_property?.('funnel_locale');
    return isFunnelLocale(value) ? value : null;
  } catch {
    return null;
  }
}

/**
 * Registers the survey locale. Only the post-purchase pages reuse a stored English locale.
 * `/` and other Vietnamese routes register `vi` and do not overwrite the stored survey locale.
 */
export function registerDocumentFunnelLocale(pathname: string | null | undefined): FunnelLocale {
  const registered = readRegisteredFunnelLocale();
  const locale = analyticsLocale(pathname, registered);
  if (surveyLocaleFromPath(pathname) || (carriesStoredFunnelLocale(pathname) && registered === locale)) {
    rememberFunnelLocale(locale);
  }
  registerFunnelSuperProperties(locale);
  return locale;
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

/** Tags every later event with the price-test arm. */
export function registerPriceTestVariant(variant: string): void {
  try {
    posthog.register({ price_test_variant: variant });
  } catch {
    // Analytics must never block checkout.
  }
}
