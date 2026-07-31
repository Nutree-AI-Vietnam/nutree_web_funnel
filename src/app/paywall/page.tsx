import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { normalizePaddleCountryCode } from '@/lib/paddle/country';
import { PaywallPageClient } from './paywall-page-client';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Your Nutree plan',
  description: 'Choose your personalized Nutree subscription.',
};

export default async function PaywallPage() {
  const requestHeaders = await headers();
  const countryCode = normalizePaddleCountryCode(requestHeaders.get('x-vercel-ip-country'));

  return <PaywallPageClient initialCountryCode={countryCode} />;
}
