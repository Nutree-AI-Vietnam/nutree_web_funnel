'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { ConversionShell } from '@/components/conversion-shell';
import { ScratchTicketCover } from '@/components/scratch-ticket-cover';
import { trackEvent, trackStepViewed } from '@/lib/analytics/track';
import { useCopy } from '@/lib/copy/use-copy';
import { activatePaywallExitOffer, expirePaywallOfferState, EXIT_DISCOUNT_CODE, EXIT_DISCOUNT_PERCENT, hasExitOfferBeenClaimed, markExitOfferClaimed, readSelectedPaywallPlan, saveSelectedPaywallPlan } from '@/lib/revenuecat/web';
import { isUserPurchased, useHydrated, useQuizStore } from '@/lib/quiz/store';
import { useLocale } from '@/lib/copy/use-copy';

interface ExitOfferPageClientProps {
  initialPlanId?: string | null;
  onClaim?: () => void;
  onDismiss?: () => void;
  onMissingLead?: () => void;
  onAlreadyClaimed?: () => void;
}

export function ExitOfferPageClient({ initialPlanId, onClaim, onDismiss, onMissingLead, onAlreadyClaimed }: ExitOfferPageClientProps) {
  const router = useRouter();
  const copy = useCopy();
  const locale = useLocale();
  const hydrated = useHydrated();
  const lead = useQuizStore((state) => state.lead);
  const purchased = useQuizStore((state) => state.purchased);
  const selectedPlanId = readSelectedPaywallPlan() ?? initialPlanId ?? null;
  const revealTriggered = useRef(false);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => trackStepViewed('exit_offer'), []);

  useEffect(() => {
    if (!hydrated) return;
    if (isUserPurchased({ purchased, lead })) {
      router.replace('/postcheckout');
      return;
    }
    if (!lead) {
      onMissingLead?.();
      return;
    }
    if (window.location.search) window.history.replaceState(window.history.state, '', window.location.pathname + window.location.hash);
    if (hasExitOfferBeenClaimed()) onAlreadyClaimed?.();
  }, [hydrated, lead, onAlreadyClaimed, onMissingLead, purchased, router]);

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
    trackEvent('exit_offer_claimed', { discount_percent: EXIT_DISCOUNT_PERCENT, discount_code: EXIT_DISCOUNT_CODE, plan: selectedPlanId });
    onClaim?.();
  };

  const returnToPlan = () => {
    expirePaywallOfferState('exit');
    if (selectedPlanId) saveSelectedPaywallPlan(selectedPlanId);
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
        <p className="text-[0.78rem] font-extrabold uppercase tracking-[0.28em] text-teal-brand">{copy.paywall.exitOfferEyebrow}</p>
        <h1 className="mx-auto mt-3 max-w-[22rem] text-[1.78rem] font-extrabold leading-[1.08] tracking-[-0.035em] text-forest sm:text-[2.08rem]">{copy.paywall.exitOfferTitle}</h1>
        <p className="mx-auto mt-3 max-w-[21rem] text-[1rem] font-semibold leading-relaxed text-slate-brand">{revealed ? copy.paywall.exitOfferRevealedHeadline : copy.paywall.exitOfferBody}</p>

        <div className="relative mx-auto mt-8 flex min-h-[9.5rem] w-[75%] max-w-[19rem] flex-col items-center justify-center overflow-hidden rounded-[1.4rem] bg-[linear-gradient(135deg,#12473d_0%,#23a890_52%,#63dbc9_100%)] px-6 py-6 text-center text-white shadow-[0_24px_64px_rgb(23_69_58_/_0.20),0_0_0_14px_rgb(229_247_241_/_0.76)] transition duration-300 focus:outline-none focus-visible:ring-4 focus-visible:ring-teal-brand/25 active:scale-[0.99] sm:min-h-[10.5rem] sm:rounded-[1.6rem]" aria-label={revealed ? copy.paywall.exitOfferTicketAria : copy.paywall.exitOfferScratchAria} role="img">
          <span className="absolute left-0 top-1/2 h-12 w-6 -translate-x-1/2 -translate-y-1/2 rounded-r-full bg-mist/95" />
          <span className="absolute right-0 top-1/2 h-12 w-6 -translate-y-1/2 translate-x-1/2 rounded-l-full bg-mist/95" />
          <span className="absolute inset-0 bg-[radial-gradient(circle_at_35%_35%,rgb(255_255_255_/_0.14),transparent_28%),radial-gradient(circle_at_82%_76%,rgb(255_255_255_/_0.12),transparent_32%)]" />
          <span className="relative block whitespace-nowrap text-[0.62rem] font-extrabold uppercase tracking-[0.22em] text-white/88 sm:text-[0.66rem] sm:tracking-[0.32em]">✨ {copy.paywall.exitOfferEyebrow} ✨</span>
          <span className="relative mt-2.5 block whitespace-nowrap text-[clamp(2rem,10vw,2.75rem)] font-extrabold uppercase leading-[0.9] tracking-[-0.05em] text-white/92 sm:text-[3.5rem]">{copy.paywall.discountTag(EXIT_DISCOUNT_PERCENT)}</span>
          <span className="relative mt-2.5 block text-[0.82rem] font-extrabold leading-snug tracking-[-0.01em] text-white/90 sm:text-[0.92rem]">{revealed ? copy.paywall.exitOfferRevealedHeadline : copy.paywall.exitOfferScratchSubhead}</span>
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
