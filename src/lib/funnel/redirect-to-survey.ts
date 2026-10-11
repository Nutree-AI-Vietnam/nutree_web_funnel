import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { localeFromCountryCode } from '@/lib/market/country';
import { surveyPathWithSearch, type PageSearchParams } from './survey-path';

export interface SurveyRedirectProps {
  searchParams: Promise<PageSearchParams>;
}

/** Sends `/` and the legacy routes to the geo-matched survey, keeping any campaign query string. */
export async function redirectToSurvey(searchParams: SurveyRedirectProps['searchParams']): Promise<never> {
  const locale = localeFromCountryCode((await headers()).get('x-vercel-ip-country'));
  redirect(surveyPathWithSearch(locale, await searchParams));
}
