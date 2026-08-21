import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { localeFromCountryCode } from '@/lib/market/country';

/** Keeps old step links inside the single canonical survey route. */
export default async function LegacyQuizStepPage() {
  redirect(`/survey/${localeFromCountryCode((await headers()).get('x-vercel-ip-country'))}`);
}
