'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ConversionShell } from '@/components/conversion-shell';
import { PrimaryButton } from '@/components/primary-button';
import { getFunnelContext, revealWelcomeReward } from '@/lib/api/client';
import { trackEvent, trackStepViewed } from '@/lib/analytics/track';
import { useCopy } from '@/lib/copy/use-copy';
import { createFallbackFunnelContext, formatOfferAmount, getRecommendedOffer } from '@/lib/funnel/catalog';
import type { FunnelContext } from '@/lib/quiz/types';
import { useHydrated, useQuizStore } from '@/lib/quiz/store';

export default function WelcomeGiftPage() {
  const router = useRouter();
  const vi = useCopy();
  const hydrated = useHydrated();
  const lead = useQuizStore((s) => s.lead);
  const ticketRef = useRef<HTMLDivElement>(null);
  const revealTriggered = useRef(false);
  const [revealed, setRevealed] = useState(false);
  const [scratchProgress, setScratchProgress] = useState(0);
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
        if (next.welcome_reward.status === 'REVEALED') {
          setRevealed(true);
          setScratchProgress(100);
          revealTriggered.current = true;
        }
      })
      .catch(() => setContext(createFallbackFunnelContext()));
  }, [hydrated, lead, router]);

  if (!hydrated) return null;
  if (!lead) return null;

  const featuredOffer = getRecommendedOffer(context.offers);
  const price = formatOfferAmount(featuredOffer.amount_due_today, featuredOffer.currency);
  const renewal = featuredOffer.renewal_description;

  const claimGift = () => {
    if (!revealed) return;
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

  return (
    <ConversionShell className="gap-8">
      <section className="flex flex-1 flex-col justify-center gap-8 py-6 text-center">
        <div className="space-y-3">
          <p className="text-xs font-extrabold uppercase tracking-[0.28em] text-teal-brand">
            {vi.welcomeGift.eyebrow}
          </p>
          <h1 className="text-[2rem] font-extrabold leading-[1.12] text-forest">
            {revealed ? vi.welcomeGift.revealedHeadline : vi.welcomeGift.headline}
          </h1>
          <p className="mx-auto max-w-sm text-base font-semibold leading-relaxed text-muted-brand">
            {revealed ? vi.welcomeGift.priceLine(price, featuredOffer.label, renewal) : vi.welcomeGift.subhead}
          </p>
        </div>

        <div
          ref={ticketRef}
          className="group relative mx-auto w-full max-w-[23rem] overflow-hidden rounded-[1.5rem] border border-emerald-brand/20 bg-[linear-gradient(135deg,#17453a_0%,#1e5447_55%,#1fa892_100%)] px-5 py-10 text-center text-white shadow-[0_24px_70px_rgb(16_39_32_/_0.18)] transition duration-300 focus:outline-none focus-visible:ring-4 focus-visible:ring-teal-brand/30 active:scale-[0.99]"
          aria-label={revealed ? vi.welcomeGift.ticketAria : vi.welcomeGift.scratchAria}
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
          <span className="absolute left-0 top-1/2 h-12 w-6 -translate-x-1/2 -translate-y-1/2 rounded-r-full bg-bg-brand" />
          <span className="absolute right-0 top-1/2 h-12 w-6 -translate-y-1/2 translate-x-1/2 rounded-l-full bg-bg-brand" />
          <span className="absolute inset-0 bg-[radial-gradient(circle_at_24%_18%,rgb(255_255_255_/_0.16),transparent_28%),radial-gradient(circle_at_80%_78%,rgb(255_255_255_/_0.12),transparent_28%)] opacity-80" />
          <span className="relative block text-xs font-extrabold uppercase tracking-[0.34em] text-white/85">
            {vi.welcomeGift.ticketLabel}
          </span>
          <span className="relative mt-4 block text-6xl font-black leading-none tracking-normal text-white">
            {vi.welcomeGift.discount}
          </span>
          <span className="relative mt-3 block text-lg font-extrabold text-white drop-shadow-sm">
            {vi.welcomeGift.ticketBody}
          </span>
          <div
            className="absolute inset-0 touch-none rounded-[1.5rem] bg-[linear-gradient(112deg,#c6ccd3_0%,#f7f9fa_26%,#b9c0c9_50%,#ffffff_74%,#aeb8c2_100%)] transition-[clip-path,opacity] duration-300 motion-reduce:transition-none"
            style={{
              clipPath: `inset(0 0 0 ${revealed ? 100 : scratchProgress}%)`,
              opacity: revealed ? 0 : 1,
            }}
          >
            <span className="absolute inset-0 bg-[repeating-linear-gradient(135deg,rgb(255_255_255_/_0.55)_0_3px,transparent_3px_15px),radial-gradient(circle_at_20%_30%,rgb(255_255_255_/_0.42),transparent_24%),radial-gradient(circle_at_78%_72%,rgb(23_37_32_/_0.08),transparent_28%)]" />
            <span className="absolute inset-0 opacity-45 [background-image:radial-gradient(circle,rgb(23_37_32_/_0.18)_0_1px,transparent_1px)] [background-size:18px_18px]" />
            <span className="absolute left-1/2 top-1/2 w-full -translate-x-1/2 -translate-y-1/2 px-8 text-center text-lg font-black text-slate-brand/60">
              {vi.welcomeGift.scratchHint}
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
        {!revealed && (
          <button
            type="button"
            onClick={finishReveal}
            className="mx-auto min-h-12 rounded-2xl border border-border-brand bg-white px-5 text-sm font-extrabold text-forest shadow-sm transition hover:bg-mist focus:outline-none focus-visible:ring-4 focus-visible:ring-teal-brand/20 active:scale-[0.98]"
          >
            {vi.welcomeGift.revealButton}
          </button>
        )}
      </section>

      <div className="sticky bottom-3">
        <PrimaryButton disabled={!revealed} onClick={claimGift} className="bg-none">
          {revealed ? vi.welcomeGift.cta : vi.welcomeGift.lockedCta}
        </PrimaryButton>
      </div>
    </ConversionShell>
  );
}
