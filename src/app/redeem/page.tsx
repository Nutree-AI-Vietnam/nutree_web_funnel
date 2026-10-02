import { cookies, headers } from 'next/headers';
import { ClearFragmentBeforeRender } from '../open-nutree/clear-fragment-before-render';
import { redeemMetadata } from './security';
import { copyFor } from '@/lib/copy';
import { localeFromCountryCode } from '@/lib/market/country';
import { appStoreUrl, playStoreUrl } from '@/lib/store-links';

export const metadata = redeemMetadata;

export default async function RedeemPage() {
  const [requestCookies, requestHeaders] = await Promise.all([cookies(), headers()]);
  const storedLocale = requestCookies.get('nutree_locale')?.value;
  const locale = storedLocale === 'vi' || storedLocale === 'en'
    ? storedLocale
    : localeFromCountryCode(requestHeaders.get('x-vercel-ip-country'));
  const copy = copyFor(locale).redeem;

  return (
    <main className="grid min-h-dvh place-items-center bg-[#f6faf7] px-5 text-charcoal">
      <ClearFragmentBeforeRender path="/redeem" />
      <section className="w-full max-w-md rounded-[2rem] border border-border-brand bg-white p-7 text-center shadow-[0_24px_70px_rgb(23_69_58_/_0.10)] sm:p-9">
        <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-teal-brand">Nutree</p>
        <h1 className="mt-4 text-3xl font-extrabold tracking-[-0.045em] text-forest">{copy.headline}</h1>
        <p className="mt-4 text-base font-semibold leading-relaxed text-slate-brand">{copy.body}</p>
        <p className="mt-3 text-sm font-semibold text-muted-brand">{copy.installHint}</p>
        <div className="mt-6 flex flex-col gap-3">
          <a href="nutree://open-nutree" className="rounded-full bg-forest px-5 py-3 font-extrabold text-white">{copy.openApp}</a>
          <a href={appStoreUrl()} className="rounded-full bg-forest px-5 py-3 font-extrabold text-white">App Store</a>
          <a href={playStoreUrl()} className="rounded-full border border-border-brand px-5 py-3 font-extrabold text-forest">Google Play</a>
        </div>
      </section>
    </main>
  );
}
