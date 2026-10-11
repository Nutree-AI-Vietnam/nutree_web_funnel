import type { Locale } from '@/lib/copy';

/** The `searchParams` shape Next.js hands a page after `await`. */
export type PageSearchParams = Record<string, string | string[] | undefined>;

/**
 * Canonical survey path that carries the incoming query string along, so a campaign
 * link to `/`, a legacy route, or `/survey/{locale}/` keeps its UTM and click-ID
 * parameters through the server redirect.
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
