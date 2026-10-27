import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { localeForVisitor } from '@/lib/market/country';
import { surveyPathWithSearch, type PageSearchParams } from './survey-path';

export interface SurveyRedirectProps {
  searchParams: Promise<PageSearchParams>;
}

/** Sends the legacy routes to the survey in the visitor's language, keeping any campaign query string. */
export async function redirectToSurvey(searchParams: SurveyRedirectProps['searchParams']): Promise<never> {
  const requestHeaders = await headers();
  const locale = localeForVisitor(requestHeaders.get('x-vercel-ip-country'), requestHeaders.get('accept-language'));
  redirect(surveyPathWithSearch(locale, await searchParams));
}
