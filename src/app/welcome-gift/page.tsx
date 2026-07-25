'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ConversionShell } from '@/components/conversion-shell';
import { getFunnelContext, revealWelcomeReward } from '@/lib/api/client';
import { trackEvent, trackStepViewed } from '@/lib/analytics/track';
import { useCopy } from '@/lib/copy/use-copy';
import { createFallbackFunnelContext, formatOfferAmount, getRecommendedOffer } from '@/lib/funnel/catalog';
import type { FunnelContext } from '@/lib/quiz/types';
import { useHydrated, useQuizStore } from '@/lib/quiz/store';

export default function WelcomeGiftPage() {
  const router = useRouter();
  const copy = useCopy();
  const hydrated = useHydrated();
  const lead = useQuizStore((s) => s.lead);
  const ticketRef = useRef<HTMLDivElement>(null);
  const revealTriggered = useRef(false);
  const [revealed, setRevealed] = useState(true);
  const [scratchProgress, setScratchProgress] = useState(100);
  const [context, setContext] = useState<FunnelContext>(() => createFallbackFunnelContext());

  useEffect(() => trackStepViewed('welcome_gift'), []);

  useEffect(() => {
    if (!hydrated) return;
    if (!lead) {
      router.replace('/email');
      return;
    }
    getFunnelContext()
      .then((next) => {
        setContext(next);
        if (next.welcome_reward.status === 'REVEALED') revealTriggered.current = true;
      })
      .catch(() => setContext(createFallbackFunnelContext()));
  }, [hydrated, lead, router]);

  if (!hydrated) return null;
  if (!lead) return null;

  const claimGift = () => {
    if (!revealed) {
      finishReveal();
      return;
    }
    trackEvent('welcome_gift_claimed', { discount_percent: 50 });
    router.push('/paywall');
  };

  const finishReveal = () => {
    if (revealTriggered.current) return;
    revealTriggered.current = true;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const showRevealed = () => {
      setRevealed(true);
      setScratchProgress(100);
      if (!reduceMotion) navigator.vibrate?.(18);
      trackEvent('welcome_gift_revealed', { discount_percent: 50 });
    };
    const leadId = lead.lead_id ?? lead.web_user_id;
    revealWelcomeReward(context.session_id, leadId)
      .then((next) => {
        setContext(next);
        showRevealed();
      })
      .catch(showRevealed);
  };

  const updateScratchProgress = (clientX: number) => {
    const rect = ticketRef.current?.getBoundingClientRect();
    if (!rect || revealed) return;
    const nextProgress = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
    setScratchProgress((current) => {
      const progress = Math.max(current, nextProgress);
      if (progress >= 76) window.setTimeout(finishReveal, 120);
      return progress;
    });
  };

  const recommended = getRecommendedOffer(context.offers);
  const welcomeAmount = formatOfferAmount(recommended.amount_due_today, recommended.currency);

  return (
    <ConversionShell className="justify-center">
      <section className="rounded-[2rem] border border-border-brand bg-white p-5 text-center shadow-[0_18px_52px_rgb(23_69_58_/_0.10)] sm:p-8">
        <p className="text-sm font-extrabold uppercase tracking-[0.18em] text-teal-brand">{copy.welcomeGift.eyebrow}</p>
        <h1 className="mt-3 text-[2.2rem] font-extrabold leading-[1.08] tracking-[-0.055em] text-forest sm:text-[2.85rem]">
          {copy.welcomeGift.headline}
        </h1>
        <p className="mt-4 text-base font-semibold leading-relaxed text-slate-brand sm:text-lg">
          {revealed ? copy.welcomeGift.revealedHeadline : copy.welcomeGift.subhead}
        </p>
        <div
          ref={ticketRef}
          className="relative mx-auto mt-7 aspect-[2.16/1] w-full overflow-hidden rounded-[1.75rem] bg-[linear-gradient(135deg,#17453a_0%,#1fa892_54%,#55d9c4_100%)] px-6 py-8 text-center text-white shadow-[0_30px_72px_rgb(31_168_146_/_0.22)] transition duration-300 focus:outline-none focus-visible:ring-4 focus-visible:ring-teal-brand/25 active:scale-[0.99] sm:rounded-[2rem] sm:px-8 sm:py-10"
          aria-label={revealed ? copy.welcomeGift.ticketAria : copy.welcomeGift.scratchAria}
          role="img"
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture(event.pointerId);
            trackEvent('welcome_reward_scratch_started', {});
            updateScratchProgress(event.clientX);
          }}
          onPointerMove={(event) => {
            if (event.buttons !== 1 && event.pointerType !== 'touch') return;
            updateScratchProgress(event.clientX);
          }}
        >
          <span className="absolute left-0 top-1/2 h-12 w-6 -translate-x-1/2 -translate-y-1/2 rounded-r-full bg-white/85 sm:h-14 sm:w-7" />
          <span className="absolute right-0 top-1/2 h-12 w-6 -translate-y-1/2 translate-x-1/2 rounded-l-full bg-white/85 sm:h-14 sm:w-7" />
          <span className="absolute inset-0 bg-[radial-gradient(circle_at_32%_28%,rgb(255_255_255_/_0.16),transparent_28%),radial-gradient(circle_at_78%_78%,rgb(255_255_255_/_0.12),transparent_30%)]" />
          <span className="relative mt-3 block text-[0.72rem] font-extrabold uppercase tracking-[0.36em] text-white/85 sm:mt-5 sm:text-[0.9rem]">
            {copy.welcomeGift.ticketLabel}
          </span>
          <span className="relative mt-4 block text-[4rem] font-extrabold leading-[0.9] tracking-[-0.06em] text-white/90 sm:text-[5.75rem]">
            -{copy.welcomeGift.discount}
          </span>
          <span className="relative mt-4 block text-base font-extrabold tracking-[-0.02em] text-white/90 sm:text-xl">
            {copy.welcomeGift.priceLine(welcomeAmount, recommended.label)}
          </span>
          <div
            className="absolute inset-0 touch-none rounded-[2rem] bg-[linear-gradient(112deg,#d6dbe5_0%,#ffffff_26%,#c8d0dc_50%,#f7f9fc_74%,#b9c4d2_100%)] transition-[clip-path,opacity] duration-300 motion-reduce:transition-none sm:rounded-[2.4rem]"
            style={{
              clipPath: `inset(0 0 0 ${revealed ? 100 : scratchProgress}%)`,
              opacity: revealed ? 0 : 1,
            }}
          >
            <span className="absolute inset-0 bg-[repeating-linear-gradient(135deg,rgb(255_255_255_/_0.55)_0_3px,transparent_3px_15px),radial-gradient(circle_at_20%_30%,rgb(255_255_255_/_0.42),transparent_24%),radial-gradient(circle_at_78%_72%,rgb(23_37_32_/_0.08),transparent_28%)]" />
            <span className="absolute inset-0 opacity-45 [background-image:radial-gradient(circle,rgb(23_37_32_/_0.18)_0_1px,transparent_1px)] [background-size:18px_18px]" />
            <span className="absolute left-1/2 top-1/2 w-full -translate-x-1/2 -translate-y-1/2 px-8 text-center text-lg font-black text-[#53625d]/70">
              {copy.welcomeGift.scratchHint}
            </span>
          </div>
          {!revealed && scratchProgress > 0 && (
            <span
              aria-hidden="true"
              className="absolute bottom-0 top-0 w-8 -translate-x-1/2 bg-[linear-gradient(90deg,transparent,rgb(255_255_255_/_0.8),transparent)] blur-[1px]"
              style={{ left: `${scratchProgress}%` }}
            />
          )}
        </div>
        <button
          type="button"
          onClick={claimGift}
          className="mt-7 min-h-16 w-full rounded-2xl bg-forest px-6 text-lg font-extrabold tracking-[-0.02em] text-white shadow-[0_18px_38px_rgb(23_69_58_/_0.22)] transition hover:bg-emerald-deep focus:outline-none focus-visible:ring-4 focus-visible:ring-teal-brand/25 active:scale-[0.99]"
        >
          {revealed ? copy.welcomeGift.cta : copy.welcomeGift.lockedCta}
        </button>
      </section>
    </ConversionShell>
  );
}
