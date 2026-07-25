'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ConversionShell } from '@/components/conversion-shell';
import { getFunnelContext, revealWelcomeReward } from '@/lib/api/client';
import { trackEvent, trackStepViewed } from '@/lib/analytics/track';
import { useCopy } from '@/lib/copy/use-copy';
import { createFallbackFunnelContext } from '@/lib/funnel/catalog';
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

  return (
    <ConversionShell hideLogo className="min-h-[calc(100dvh-3rem)] justify-between gap-8">
      <div className="flex justify-center pt-1">
        <Link href="/" aria-label="Nutree" className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/70 bg-white/75 shadow-[inset_0_0_0_1px_rgb(255_255_255_/_0.55),0_8px_24px_rgb(16_39_32_/_0.08)] backdrop-blur">
          <Image src="/nutree-logo-simple.png" alt="" width={72} height={64} priority className="h-8 w-8 object-contain" />
        </Link>
      </div>

      <section className="flex flex-1 flex-col justify-center text-center">
        <p className="text-[0.78rem] font-extrabold uppercase tracking-[0.28em] text-teal-brand">{copy.welcomeGift.eyebrow}</p>
        <h1 className="mx-auto mt-3 max-w-[22rem] text-[1.78rem] font-extrabold leading-[1.08] tracking-[-0.035em] text-forest sm:text-[2.08rem]">
          {copy.welcomeGift.headline}
        </h1>
        <p className="mx-auto mt-3 max-w-[21rem] text-[1rem] font-semibold leading-relaxed text-slate-brand">
          {revealed ? copy.welcomeGift.revealedHeadline : copy.welcomeGift.subhead}
        </p>

        <div
          ref={ticketRef}
          className="relative mx-auto mt-8 aspect-[2.28/1] w-full max-w-[25.5rem] overflow-hidden rounded-[1.45rem] bg-[linear-gradient(135deg,#696ff4_0%,#9c63ee_50%,#5fbbe4_100%)] px-6 py-7 text-center text-white shadow-[0_26px_74px_rgb(111_113_244_/_0.24),0_0_0_22px_rgb(236_241_255_/_0.72)] transition duration-300 focus:outline-none focus-visible:ring-4 focus-visible:ring-teal-brand/25 active:scale-[0.99] sm:rounded-[1.65rem]"
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
          <span className="absolute left-0 top-1/2 h-12 w-6 -translate-x-1/2 -translate-y-1/2 rounded-r-full bg-mist/95" />
          <span className="absolute right-0 top-1/2 h-12 w-6 -translate-y-1/2 translate-x-1/2 rounded-l-full bg-mist/95" />
          <span className="absolute inset-0 bg-[radial-gradient(circle_at_35%_35%,rgb(255_255_255_/_0.14),transparent_28%),radial-gradient(circle_at_82%_76%,rgb(255_255_255_/_0.12),transparent_32%)]" />
          <span className="relative mt-2 block text-[0.68rem] font-extrabold uppercase tracking-[0.36em] text-white/88">
            ✨ {copy.welcomeGift.eyebrow} ✨
          </span>
          <span className="relative mt-3 block text-[3.65rem] font-extrabold leading-[0.88] tracking-[-0.055em] text-white/92 sm:text-[4.55rem]">
            {copy.welcomeGift.ticketValue}
          </span>
          <span className="relative mt-3 block text-[0.98rem] font-extrabold tracking-[-0.01em] text-white/90">
            {revealed ? copy.welcomeGift.revealedHeadline : copy.welcomeGift.subhead}
          </span>
          <div
            className="absolute inset-0 touch-none rounded-[1.55rem] bg-[linear-gradient(112deg,#d6dbe5_0%,#ffffff_26%,#c8d0dc_50%,#f7f9fc_74%,#b9c4d2_100%)] transition-[clip-path,opacity] duration-300 motion-reduce:transition-none sm:rounded-[1.8rem]"
            style={{
              clipPath: `inset(0 0 0 ${revealed ? 100 : scratchProgress}%)`,
              opacity: revealed ? 0 : 1,
            }}
          >
            <span className="absolute inset-0 bg-[repeating-linear-gradient(135deg,rgb(255_255_255_/_0.55)_0_3px,transparent_3px_15px),radial-gradient(circle_at_20%_30%,rgb(255_255_255_/_0.42),transparent_24%),radial-gradient(circle_at_78%_72%,rgb(23_37_32_/_0.08),transparent_28%)]" />
            <span className="absolute inset-0 opacity-45 [background-image:radial-gradient(circle,rgb(23_37_32_/_0.18)_0_1px,transparent_1px)] [background-size:18px_18px]" />
            <span className="absolute left-1/2 top-1/2 w-full -translate-x-1/2 -translate-y-1/2 px-8 text-center text-base font-black text-[#53625d]/70">
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
      </section>

      <button
        type="button"
        onClick={claimGift}
        className="min-h-14 w-full rounded-2xl bg-forest px-6 text-base font-extrabold tracking-[-0.01em] text-white shadow-[0_16px_34px_rgb(23_69_58_/_0.22)] transition hover:bg-emerald-deep focus:outline-none focus-visible:ring-4 focus-visible:ring-teal-brand/25 active:scale-[0.99]"
      >
        {revealed ? copy.welcomeGift.cta : copy.welcomeGift.lockedCta}
      </button>
    </ConversionShell>
  );
}
