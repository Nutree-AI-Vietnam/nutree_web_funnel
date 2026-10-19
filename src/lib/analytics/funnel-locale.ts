/**
 * Web-funnel locale for analytics. English is only `/survey/en`.
 * Vietnamese and every other route stay on the default dataset.
 * Kept in sync with `Locale` in src/lib/copy (`vi` | `en`).
 */
export const FUNNEL_LOCALES = ['vi', 'en'] as const;
export type FunnelLocale = (typeof FUNNEL_LOCALES)[number];

const SURVEY_LOCALE = /^\/survey\/(en|vi)(?:\/|$)/;

/** Survives the full document load from the survey into /postcheckout in the same tab. */
export const FUNNEL_LOCALE_STORAGE_KEY = 'nutree_funnel_locale_v1';

export function isFunnelLocale(value: unknown): value is FunnelLocale {
  return value === 'vi' || value === 'en';
}

/** `en` or `vi` when the path is that survey, otherwise null. */
export function surveyLocaleFromPath(pathname: string | null | undefined): FunnelLocale | null {
  const match = pathname?.match(SURVEY_LOCALE);
  return match?.[1] === 'en' || match?.[1] === 'vi' ? match[1] : null;
}

/** English survey routes are `en`. Everything else, including `/`, is `vi`. */
export function funnelLocaleFromPath(pathname: string | null | undefined): FunnelLocale {
  return surveyLocaleFromPath(pathname) ?? 'vi';
}

export function funnelName(locale: FunnelLocale): 'web_funnel_vi' | 'web_funnel_en' {
  return locale === 'en' ? 'web_funnel_en' : 'web_funnel_vi';
}

/**
 * Locale of the pixel chosen for this document load.
 * The route's root layout sets `data-funnel-locale` and it does not follow client navigations,
 * so the browser pixel and the Conversions API copy stay on the same dataset.
 */
export function readLockedFunnelLocale(): FunnelLocale {
  if (typeof document !== 'undefined') {
    const locked = document.documentElement?.getAttribute('data-funnel-locale');
    if (isFunnelLocale(locked)) return locked;
  }
  if (typeof window !== 'undefined') return funnelLocaleFromPath(window.location?.pathname);
  return 'vi';
}

/** Writes the survey locale so a later full page load can keep it. */
export function rememberFunnelLocale(locale: FunnelLocale): void {
  try {
    sessionStorage.setItem(FUNNEL_LOCALE_STORAGE_KEY, locale);
  } catch {
    // Private mode and non-browser tests have no storage.
  }
}

/** Locale carried from the survey, if this tab stored one. */
export function readRememberedFunnelLocale(): FunnelLocale | null {
  try {
    const stored = sessionStorage.getItem(FUNNEL_LOCALE_STORAGE_KEY);
    return isFunnelLocale(stored) ? stored : null;
  } catch {
    return null;
  }
}

/**
 * PostHog locale. An explicit survey path wins so a language switch is visible.
 * Other routes keep the locale stored for this tab, then an already registered
 * super property, and only then the document default.
 */
export function analyticsLocale(pathname: string | null | undefined, registered?: unknown): FunnelLocale {
  const survey = surveyLocaleFromPath(pathname);
  if (survey) return survey;
  const remembered = readRememberedFunnelLocale();
  if (remembered) return remembered;
  if (isFunnelLocale(registered)) return registered;
  return readLockedFunnelLocale();
}
