'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { ConversionShell } from '@/components/conversion-shell';
import { ScratchTicketCover } from '@/components/scratch-ticket-cover';
import { trackEvent, trackStepViewed } from '@/lib/analytics/track';
import { useCopy } from '@/lib/copy/use-copy';
import { activatePaywallExitOffer, expirePaywallOfferState, EXIT_DISCOUNT_CODE, EXIT_DISCOUNT_PERCENT, hasExitOfferBeenClaimed, markExitOfferClaimed, readSelectedPaywallPlan, saveSelectedPaywallPlan } from '@/lib/revenuecat/web';
import { createRevenueCatPaywallPlans, type RevenueCatPaywallPlanId } from '@/lib/revenuecat/paywall-plans';
import { useHydrated, useQuizStore } from '@/lib/quiz/store';
import { useLocale } from '@/lib/copy/use-copy';

interface ExitOfferPageClientProps {
  initialPlanId: RevenueCatPaywallPlanId;
  onClaim?: () => void;
  onDismiss?: () => void;
  onMissingLead?: () => void;
  onAlreadyClaimed?: () => void;
}

export function ExitOfferPageClient({ initialPlanId, onClaim, onDismiss, onMissingLead, onAlreadyClaimed }: ExitOfferPageClientProps) {
  const copy = useCopy();
  const locale = useLocale();
  const hydrated = useHydrated();
  const lead = useQuizStore((state) => state.lead);
  const plans = createRevenueCatPaywallPlans();
  const selectedPlanId = readSelectedPaywallPlan() ?? initialPlanId;
  const selectedPlan = plans.find((plan) => plan.id === selectedPlanId) ?? plans[2];
  const revealTriggered = useRef(false);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => trackStepViewed('exit_offer'), []);

  useEffect(() => {
    if (!hydrated) return;
    if (!lead) {
      onMissingLead?.();
      return;
    }
    if (window.location.search) window.history.replaceState(window.history.state, '', window.location.pathname + window.location.hash);
    if (hasExitOfferBeenClaimed()) onAlreadyClaimed?.();
  }, [hydrated, lead, onAlreadyClaimed, onMissingLead]);

  if (!hydrated || !lead) return null;

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
    saveSelectedPaywallPlan(selectedPlan.id);
    trackEvent('exit_offer_claimed', { discount_percent: EXIT_DISCOUNT_PERCENT, discount_code: EXIT_DISCOUNT_CODE, plan: selectedPlan.id });
    onClaim?.();
  };

  const returnToPlan = () => {
    expirePaywallOfferState('exit');
    saveSelectedPaywallPlan(selectedPlan.id);
    onDismiss?.();
  };

  return (
    <ConversionShell hideLogo className="min-h-[calc(100dvh-3rem)] justify-between gap-8">
      <div className="flex justify-center pt-1">
        <Link href={`/survey/${locale}`} aria-label="Nutree" className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/70 bg-white/75 shadow-[inset_0_0_0_1px_rgb(255_255_255_/_0.55),0_8px_24px_rgb(16_39_32_/_0.08)] backdrop-blur">
          <Image src="/nutree-logo-simple.png" alt="" width={72} height={64} priority className="h-8 w-8 object-contain" />
        </Link>
      </div>

      <section className="flex flex-1 flex-col justify-center text-center">
        <h1 className="mx-auto mt-3 max-w-[23rem] text-[1.78rem] font-extrabold leading-[1.08] tracking-[-0.035em] text-forest sm:text-[2.08rem]">{copy.paywall.exitOfferTitle}</h1>
        <p className="mx-auto mt-3 max-w-[22rem] text-[1rem] font-semibold leading-relaxed text-slate-brand">{revealed ? copy.paywall.exitOfferRevealedHeadline : copy.paywall.exitOfferBody}</p>

        <div className="relative mx-auto mt-8 aspect-[2.18/1] w-[calc(100%+1rem)] max-w-[27rem] overflow-hidden rounded-[1.55rem] bg-[linear-gradient(135deg,#8b1e3f_0%,#ef4d59_52%,#ff8a1f_100%)] px-6 py-8 text-center text-white shadow-[0_30px_82px_rgb(239_77_89_/_0.24),0_0_0_24px_rgb(255_240_235_/_0.82)] transition duration-300 focus:outline-none focus-visible:ring-4 focus-visible:ring-orange-300/25 active:scale-[0.99] sm:rounded-[1.75rem]" aria-label={revealed ? copy.paywall.exitOfferTicketAria : copy.paywall.exitOfferScratchAria} role="img">
          <span className="absolute left-0 top-1/2 h-14 w-7 -translate-x-1/2 -translate-y-1/2 rounded-r-full bg-mist/95" />
          <span className="absolute right-0 top-1/2 h-14 w-7 -translate-y-1/2 translate-x-1/2 rounded-l-full bg-mist/95" />
          <span className="absolute inset-0 bg-[radial-gradient(circle_at_35%_35%,rgb(255_255_255_/_0.18),transparent_28%),radial-gradient(circle_at_82%_76%,rgb(255_255_255_/_0.14),transparent_32%)]" />
          <span className="relative mt-2 block text-[0.72rem] font-extrabold uppercase tracking-[0.36em] text-white/88">✨ {copy.paywall.exitOfferEyebrow} ✨</span>
          <span className="relative mt-3 block text-[4.05rem] font-extrabold leading-[0.88] tracking-[-0.055em] text-white/92 sm:text-[4.9rem]">{EXIT_DISCOUNT_PERCENT}%</span>
          <span className="relative mt-3 block text-[1.02rem] font-extrabold tracking-[-0.01em] text-white/90">{revealed ? copy.paywall.exitOfferRevealedHeadline : copy.paywall.exitOfferScratchSubhead}</span>
          <ScratchTicketCover
            revealed={revealed}
            hint={copy.paywall.exitOfferScratchHint}
            onScratchStart={() => trackEvent('exit_offer_scratch_started', {})}
            onReveal={finishReveal}
            hintClassName="text-base"
          />
        </div>
      </section>

      <div className="grid gap-3">
      <button type="button" onClick={claimExitOffer} className="min-h-14 w-full rounded-2xl bg-forest px-6 text-base font-extrabold tracking-[-0.01em] text-white shadow-[0_16px_34px_rgb(23_69_58_/_0.22)] transition hover:bg-emerald-deep focus:outline-none focus-visible:ring-4 focus-visible:ring-teal-brand/25 active:scale-[0.99]">{revealed ? copy.paywall.exitOfferCta : copy.paywall.exitOfferLockedCta}</button>
        <button type="button" onClick={returnToPlan} className="min-h-11 w-full text-sm font-bold text-muted-brand underline underline-offset-4">{copy.paywall.exitOfferDismiss}</button>
      </div>
    </ConversionShell>
  );
}
