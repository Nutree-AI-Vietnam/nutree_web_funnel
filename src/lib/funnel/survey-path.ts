import type { Locale } from '@/lib/copy';

/** The `searchParams` shape Next.js hands a page after `await`. */
export type PageSearchParams = Record<string, string | string[] | undefined>;

/**
 * Canonical survey path that carries the incoming query string along, so a campaign
 * link to `/`, a legacy route, or `/survey/{locale}/` keeps its UTM and click-ID
 * parameters through the server redirect.
 *
 * Main-site English buy handoff (preexisting, not a checkout URL):
 * `https://quiz.nutreeai.com/survey/en`, plus the site's existing UTM query if it
 * has one. The path language overrides a stored Vietnamese locale. Paddle is the
 * quiz paywall's existing RevenueCat checkout after the quiz; this helper does
 * not build a Paddle link. Do not send English buyers to `/` or `/paywall`:
 * those follow country and Accept-Language.
 */
export function surveyPathWithSearch(locale: Locale, searchParams: PageSearchParams = {}): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (value === undefined) continue;
    for (const item of Array.isArray(value) ? value : [value]) query.append(key, item);
  }
  const search = query.toString();
  return search ? `/survey/${locale}?${search}` : `/survey/${locale}`;
}
