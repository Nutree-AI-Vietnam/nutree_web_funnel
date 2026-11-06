'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import { usePathname } from 'next/navigation';
import { MetaPixel } from '@/app/meta-pixel';
import { AnalyticsScripts } from '@/components/analytics-scripts';
import { optionalConsentCopy } from '@/lib/copy/optional-consent-copy';
import { useCopy, useLocale } from '@/lib/copy/use-copy';
import {
  clearMarketingCookies,
  readOptionalConsent,
  subscribeOptionalConsent,
  writeOptionalConsent,
} from '@/lib/analytics/optional-consent';
import { startOptionalAnalytics, stopOptionalAnalytics } from '@/lib/analytics/optional-analytics';
import { isFragmentCapabilityRoute } from '@/lib/handoff/fragment-capability-route';

/** False during server render and hydration, true once this browser can read the stored choice. */
function useClientReady(): boolean {
  return useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );
}

function revokeLoadedPixels(): void {
  const w = window as Window & {
    fbq?: (...args: unknown[]) => void;
    ttq?: { revokeConsent?: () => void; disableCookie?: () => void };
    gtag?: (...args: unknown[]) => void;
  };
  try { w.fbq?.('consent', 'revoke'); } catch { /* already blocked */ }
  try { w.ttq?.revokeConsent?.(); w.ttq?.disableCookie?.(); } catch { /* already blocked */ }
  try {
    w.gtag?.('consent', 'update', {
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
      analytics_storage: 'denied',
    });
  } catch { /* already blocked */ }
}

/**
 * Optional-cookie banner. Trackers mount only after Allow. Reject and
 * withdrawal do not flush anything that happened before the choice.
 */
export function OptionalCookieConsent({ pixelId }: { pixelId: string }) {
  const locale = useLocale();
  const copy = optionalConsentCopy[locale];
  const privacy = useCopy().landing.legal;
  const pathname = usePathname();
  const ready = useClientReady();
  const [forced, setForced] = useState(false);
  const choice = useSyncExternalStore(subscribeOptionalConsent, readOptionalConsent, () => null);
  const hidden = isFragmentCapabilityRoute(pathname ?? '');

  useEffect(() => {
    if (choice === 'granted') startOptionalAnalytics();
  }, [choice]);

  useEffect(() => {
    const root = document.documentElement;
    if (ready && (choice === null || forced) && !hidden) root.style.setProperty('--cookie-banner-offset', '11rem');
    else root.style.removeProperty('--cookie-banner-offset');
    return () => {
      root.style.removeProperty('--cookie-banner-offset');
    };
  }, [choice, forced, hidden, ready]);

  if (hidden) return null;
  const granted = ready && choice === 'granted';
  const showBanner = ready && (choice === null || forced);

  const choose = (next: 'granted' | 'denied') => {
    const previous = readOptionalConsent();
    writeOptionalConsent(next);
    setForced(false);
    if (next === 'granted') {
      startOptionalAnalytics();
      return;
    }
    if (previous === 'granted') {
      stopOptionalAnalytics();
      revokeLoadedPixels();
      clearMarketingCookies();
      window.location.reload();
    }
  };

  return (
    <>
      {granted ? <MetaPixel pixelId={pixelId} /> : null}
      {granted ? <AnalyticsScripts /> : null}
      {showBanner ? (
        <section
          role="dialog"
          aria-modal="false"
          aria-labelledby="optional-cookie-title"
          className="fixed inset-x-0 bottom-0 z-40 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
        >
          <div className="mx-auto max-w-lg rounded-[1.4rem] border border-border-brand bg-white p-4 shadow-[0_18px_46px_rgb(23_69_58_/_0.16)]">
            <h2 id="optional-cookie-title" className="text-[1rem] font-extrabold text-forest">{copy.title}</h2>
            <p className="mt-1 text-[0.9rem] font-semibold leading-snug text-slate-brand">{copy.body}</p>
            <p className="mt-2 text-[0.8rem] font-semibold text-muted-brand">
              <a href={privacy.privacyUrl} className="font-extrabold text-forest underline">{privacy.privacy}</a>
            </p>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <button type="button" onClick={() => choose('denied')} className="min-h-12 rounded-2xl border-2 border-forest bg-white px-3 text-[0.92rem] font-extrabold text-forest focus:outline-none focus-visible:ring-4 focus-visible:ring-teal-brand/30">{copy.reject}</button>
              <button type="button" onClick={() => choose('granted')} className="min-h-12 rounded-2xl border-2 border-forest bg-forest px-3 text-[0.92rem] font-extrabold text-white focus:outline-none focus-visible:ring-4 focus-visible:ring-teal-brand/30">{copy.accept}</button>
            </div>
          </div>
        </section>
      ) : ready ? (
        <button type="button" onClick={() => setForced(true)} className="fixed bottom-[max(0.5rem,env(safe-area-inset-bottom))] left-3 z-30 min-h-11 rounded-full border border-border-brand bg-white px-3 text-[0.8rem] font-extrabold text-forest shadow-sm focus:outline-none focus-visible:ring-4 focus-visible:ring-teal-brand/30">{copy.choices}</button>
      ) : null}
    </>
  );
}
