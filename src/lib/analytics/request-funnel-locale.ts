import { headers } from 'next/headers';
import { FUNNEL_PATH_HEADER, funnelLocaleFromPath, type FunnelLocale } from './funnel-locale';

/** Locale for this request, from the path the proxy recorded. Missing header means Vietnamese. */
export async function requestFunnelLocale(): Promise<FunnelLocale> {
  const pathname = (await headers()).get(FUNNEL_PATH_HEADER);
  return funnelLocaleFromPath(pathname);
}
