import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { localeFromCountryCode } from '@/lib/market/country';

export default async function RootPage() {
  redirect(`/survey/${localeFromCountryCode((await headers()).get('x-vercel-ip-country'))}`);
}
