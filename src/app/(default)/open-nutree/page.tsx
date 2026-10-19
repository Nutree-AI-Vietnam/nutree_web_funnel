import { cookies, headers } from 'next/headers';
import { RedemptionEmailGuide } from '@/components/redemption-email-guide';
import { copyFor } from '@/lib/copy';
import { localeFromCountryCode } from '@/lib/market/country';
import { ClearFragmentBeforeRender } from './clear-fragment-before-render';
import { openNutreeMetadata } from './security';

export const metadata = openNutreeMetadata;

export default async function OpenNutreePage() {
  const [requestCookies, requestHeaders] = await Promise.all([cookies(), headers()]);
  const storedLocale = requestCookies.get('nutree_locale')?.value;
  const locale = storedLocale === 'vi' || storedLocale === 'en'
    ? storedLocale
    : localeFromCountryCode(requestHeaders.get('x-vercel-ip-country'));

  return (
    <main className="grid min-h-dvh place-items-center bg-[#f6faf7] px-5 text-charcoal">
      <ClearFragmentBeforeRender />
      <RedemptionEmailGuide copy={copyFor(locale).redeem} />
    </main>
  );
}
