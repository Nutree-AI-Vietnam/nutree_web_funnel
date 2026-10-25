'use client';

import Link from 'next/link';
import { NutreeLogo } from '@/components/nutree-logo';
import { useEffect, useRef, useState } from 'react';
import { ConversionShell } from '@/components/conversion-shell';
import { ScratchTicketCover } from '@/components/scratch-ticket-cover';
import { stripNonAttributionParams } from '@/lib/analytics/attribution';
import { trackEvent, trackStepViewed } from '@/lib/analytics/track';
import { useCopy } from '@/lib/copy/use-copy';
import { SIX_MONTH_PLAN_ID } from '@/lib/revenuecat/paywall-plans';
import { activatePaywallExitOffer, expirePaywallOfferState, EXIT_DISCOUNT_PERCENT, hasExitOfferBeenClaimed, markExitOfferClaimed, saveSelectedPaywallPlan } from '@/lib/revenuecat/web';
import { isUserPurchased, useHydrated, useQuizStore } from '@/lib/quiz/store';
import { usePostcheckoutRedirect } from '@/lib/revenuecat/use-postcheckout-redirect';
import { useLocale } from '@/lib/copy/use-copy';
import { Purchases, type Period } from '@revenuecat/purchases-js';
import { isLocalPreviewHost } from '@/lib/local-preview';
import { buildRevenueCatPaywall, checkoutPackage } from '@/lib/revenuecat/paywall-plans';
import { localPreviewOffering } from '@/lib/revenuecat/local-preview-offering';
import { readRevenueCatWebConfig } from '@/lib/revenuecat/web';

/**
 * The exit price of the plan in package `$rc_six_month` (a 1-year product in the international offering)
 * next to the price shown on the paywall, with that plan's billing period, read from the live offering.
 */
function useEnglishExitPrice(enabled: boolean): { price: string; was: string; period: Period | null } | null {
  const [prices, setPrices] = useState<{ price: string; was: string; period: Period | null } | null>(null);
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    const load = async () => {
      let offering;
      if (isLocalPreviewHost() && !process.env.NEXT_PUBLIC_REVENUECAT_WEB_API_KEY) {
        offering = localPreviewOffering('US');
      } else {
        if (!Purchases.isConfigured()) return;
        const config = readRevenueCatWebConfig(undefined, 'US');
        const offerings = await Purchases.getSharedInstance().getOfferings({ offeringIdentifier: config.offeringIdentifier, currency: 'USD' });
        offering = offerings.all[config.offeringIdentifier];
      }
      const plan = offering && buildRevenueCatPaywall(offering).plans.find((item) => item.id === SIX_MONTH_PLAN_ID);
      if (!plan || cancelled) return;
      const exit = checkoutPackage(plan, 'exit');
      const shown = checkoutPackage(plan, 'welcome');
      if (exit === shown) return;
      const priceOf = (product: typeof exit.webBillingProduct) => (product.introPricePhase?.price ?? product.price).formattedPrice;
      setPrices({ price: priceOf(exit.webBillingProduct), was: priceOf(shown.webBillingProduct), period: exit.webBillingProduct.period ?? null });
    };
    load().catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [enabled]);
  return prices;
}

interface ExitOfferPageClientProps {
  onClaim?: () => void;
  onDismiss?: () => void;
  onMissingLead?: () => void;
  onAlreadyClaimed?: () => void;
}

export function ExitOfferPageClient({ onClaim, onDismiss, onMissingLead, onAlreadyClaimed }: ExitOfferPageClientProps) {
  const copy = useCopy();
  const locale = useLocale();
  const hydrated = useHydrated();
  const lead = useQuizStore((state) => state.lead);
  const purchased = useQuizStore((state) => state.purchased);
  const selectedPlanId = SIX_MONTH_PLAN_ID;
  const revealTriggered = useRef(false);
  const [revealed, setRevealed] = useState(false);
  // English names the real price; it never claims a percentage that holds for one plan only.
  const english = locale === 'en';
  const englishPrice = useEnglishExitPrice(english);
  const exitCopy = copy.funnel.exitOffer;
  // Name the plan by its real billing period ("1 year"), never a fixed length.
  const exitPeriod = englishPrice?.period;
  const exitPlanLength = exitPeriod
    ? `${exitPeriod.number} ${copy.funnel.paywall.planName[exitPeriod.unit][exitPeriod.number === 1 ? 0 : 1]}`
    : null;
  const englishPriceLine = englishPrice && exitPlanLength ? exitCopy.price(exitPlanLength, englishPrice.price, englishPrice.was) : exitCopy.priceFallback;

  useEffect(() => trackStepViewed('exit_offer'), []);

  usePostcheckoutRedirect(hydrated && isUserPurchased({ purchased, lead }));

  useEffect(() => {
    if (!hydrated || isUserPurchased({ purchased, lead })) return;
    if (!lead) {
      onMissingLead?.();
      return;
    }
    stripNonAttributionParams();
    if (hasExitOfferBeenClaimed()) onAlreadyClaimed?.();
  }, [hydrated, lead, onAlreadyClaimed, onMissingLead, purchased]);

  if (!hydrated || !lead || isUserPurchased({ purchased, lead })) return null;

  const finishReveal = () => {
    if (revealTriggered.current) return;
    revealTriggered.current = true;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setRevealed(true);
    if (!reduceMotion) navigator.vibrate?.(18);
    trackEvent('exit_offer_revealed', { discount_percent: EXIT_DISCOUNT_PERCENT });
  };

  const claimExitOffer = () => {
    if (hasExitOfferBeenClaimed()) {
      onAlreadyClaimed?.();
      return;
    }
    if (!revealed) {
      finishReveal();
      return;
    }
    markExitOfferClaimed();
    activatePaywallExitOffer();
    if (selectedPlanId) saveSelectedPaywallPlan(selectedPlanId);
    trackEvent('exit_offer_claimed', { discount_percent: EXIT_DISCOUNT_PERCENT, plan: selectedPlanId });
    onClaim?.();
  };

  const returnToPlan = () => {
    expirePaywallOfferState('exit');
    if (selectedPlanId) saveSelectedPaywallPlan(selectedPlanId);
    onDismiss?.();
  };

  return (
    <ConversionShell hideLogo className="min-h-0 justify-between gap-3">
      <div className="flex shrink-0 justify-center pt-1">
        <Link href={`/survey/${locale}`} aria-label="Nutree" className="block h-12 w-12">
          <NutreeLogo priority className="h-12 w-12 shadow-[0_8px_24px_rgb(16_39_32_/_0.08)]" />
        </Link>
      </div>

      <section className="flex min-h-0 flex-1 flex-col justify-center overflow-y-auto text-center">
        <p className="text-[0.78rem] font-extrabold tracking-[0.02em] text-rose-600">{english ? exitCopy.eyebrow : copy.paywall.exitOfferEyebrow}</p>
        <h1 className="mx-auto mt-3 max-w-[22rem] text-[1.78rem] font-extrabold leading-[1.08] tracking-[-0.035em] text-forest sm:text-[2.08rem]">{english ? exitCopy.title : copy.paywall.exitOfferTitle}</h1>
        <p className="mx-auto mt-3 max-w-[21rem] text-[1rem] font-semibold leading-relaxed text-slate-brand">{english ? exitCopy.body : revealed ? copy.paywall.exitOfferRevealedHeadline : copy.paywall.exitOfferBody}</p>

        <div className="relative mx-auto mt-4 flex min-h-[7.25rem] w-[75%] max-w-[19rem] flex-col items-center justify-center overflow-hidden rounded-[1.4rem] bg-[linear-gradient(135deg,#9f1239_0%,#e11d48_52%,#fb7185_100%)] px-6 py-4 text-center text-white shadow-[0_16px_40px_rgb(159_18_57_/_0.22),0_0_0_8px_rgb(255_228_230_/_0.76)] transition duration-300 focus:outline-none focus-visible:ring-4 focus-visible:ring-teal-brand/25 active:scale-[0.99] sm:mt-8 sm:min-h-[10.5rem] sm:rounded-[1.6rem] sm:py-6 sm:shadow-[0_24px_64px_rgb(159_18_57_/_0.22),0_0_0_14px_rgb(255_228_230_/_0.76)]" aria-label={revealed ? copy.paywall.exitOfferTicketAria : copy.paywall.exitOfferScratchAria} role="img">
          <span className="absolute left-0 top-1/2 h-12 w-6 -translate-x-1/2 -translate-y-1/2 rounded-r-full bg-mist/95" />
          <span className="absolute right-0 top-1/2 h-12 w-6 -translate-y-1/2 translate-x-1/2 rounded-l-full bg-mist/95" />
          <span className="absolute inset-0 bg-[radial-gradient(circle_at_35%_35%,rgb(255_255_255_/_0.14),transparent_28%),radial-gradient(circle_at_82%_76%,rgb(255_255_255_/_0.12),transparent_32%)]" />
          <span className="relative block whitespace-nowrap text-[0.62rem] font-extrabold tracking-[0.02em] text-white/88 sm:text-[0.66rem] sm:tracking-[0.02em]">✨ {english ? exitCopy.eyebrow : copy.paywall.exitOfferEyebrow} ✨</span>
          <span className="relative mt-2.5 block whitespace-nowrap text-[clamp(2rem,10vw,2.75rem)] font-extrabold leading-[0.9] tracking-[-0.05em] text-white/92 sm:text-[3.5rem]">{english ? englishPrice?.price ?? exitCopy.title : copy.paywall.discountTag(EXIT_DISCOUNT_PERCENT)}</span>
          <span className="relative mt-2.5 block text-[0.82rem] font-extrabold leading-snug tracking-[-0.01em] text-white/90 sm:text-[0.92rem]">{revealed ? (english ? englishPriceLine : copy.paywall.exitOfferPrice) : copy.paywall.exitOfferScratchSubhead}</span>
          <ScratchTicketCover
            revealed={revealed}
            hint={copy.paywall.exitOfferScratchHint}
            onScratchStart={() => trackEvent('exit_offer_scratch_started', {})}
            onReveal={finishReveal}
            hintClassName="text-base"
          />
        </div>
      </section>

      <div className="grid shrink-0 gap-3">
      <button type="button" onClick={claimExitOffer} className="min-h-14 w-full rounded-2xl bg-rose-600 px-6 text-base font-extrabold tracking-[-0.01em] text-white shadow-[0_16px_34px_rgb(159_18_57_/_0.28)] transition hover:bg-rose-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-rose-500/25 active:scale-[0.99]">{revealed ? (english ? exitCopy.cta : copy.paywall.exitOfferCta) : copy.paywall.exitOfferLockedCta}</button>
        <button type="button" onClick={returnToPlan} className="min-h-11 w-full text-sm font-bold text-muted-brand underline underline-offset-4">{english ? exitCopy.dismiss : copy.paywall.exitOfferDismiss}</button>
      </div>
    </ConversionShell>
  );
}
