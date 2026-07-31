import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { normalizePaddleCountryCode } from '@/lib/paddle/country';
import { PricingPageClient } from './pricing-page-client';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Pricing',
  description: 'Choose a Nutree plan and subscribe securely with Paddle.',
  alternates: {
    canonical: '/pricing',
  },
};

export default async function PricingPage() {
  const requestHeaders = await headers();
  const countryCode = normalizePaddleCountryCode(requestHeaders.get('x-vercel-ip-country'));

  return <PricingPageClient initialCountryCode={countryCode} />;
}

