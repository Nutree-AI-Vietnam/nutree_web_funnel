/**
 * Web-funnel locale for analytics. English is only `/survey/en`.
 * Vietnamese and every other route stay on the default dataset.
 * Kept in sync with `Locale` in src/lib/copy (`vi` | `en`).
 */
export const FUNNEL_LOCALES = ['vi', 'en'] as const;
export type FunnelLocale = (typeof FUNNEL_LOCALES)[number];

/** Request header set by src/proxy.ts from the real URL, never from the browser body. */
export const FUNNEL_PATH_HEADER = 'x-nutree-pathname';

const SURVEY_LOCALE = /^\/survey\/(en|vi)(?:\/|$)/;

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
 * The root layout sets `data-funnel-locale` and it does not follow client navigations,
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

/**
 * PostHog locale. An explicit survey path wins so a language switch is visible.
 * Other routes keep the locale from the first load.
 */
export function analyticsLocale(pathname: string | null | undefined): FunnelLocale {
  return surveyLocaleFromPath(pathname) ?? readLockedFunnelLocale();
}
