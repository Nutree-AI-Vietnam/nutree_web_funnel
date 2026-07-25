'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getFunnelContext, revealWelcomeReward } from '@/lib/api/client';
import { trackEvent, trackStepViewed } from '@/lib/analytics/track';
import { createFallbackFunnelContext } from '@/lib/funnel/catalog';
import type { FunnelContext } from '@/lib/quiz/types';
import { useHydrated, useQuizStore } from '@/lib/quiz/store';

export default function WelcomeGiftPage() {
  const router = useRouter();
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
    <main className="flex min-h-dvh w-full flex-col bg-[#fbfefc] px-5 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(2.25rem,env(safe-area-inset-top))] text-center text-forest">
      <div className="mx-auto text-[2rem] font-extrabold leading-none tracking-[-0.04em] text-forest">
        Nut<span className="text-teal-brand">ree</span>
      </div>

      <section className="mx-auto flex w-full max-w-lg flex-1 flex-col pt-[26vh] sm:pt-[28vh]">
        <div>
          <h1 className="text-[2.25rem] font-extrabold leading-[1.08] tracking-[-0.055em] text-forest sm:text-[3.25rem]">
            Quà chào mừng của bạn đã sẵn sàng 🎁
          </h1>
          <p className="mt-5 text-[1.35rem] font-semibold leading-tight tracking-[-0.02em] text-muted-brand sm:text-[1.75rem]">
            Cào thẻ để mở ưu đãi Nutree
          </p>
        </div>

        <div
          ref={ticketRef}
          className="relative mx-auto mt-12 aspect-[2.16/1] w-full max-w-lg overflow-hidden rounded-[2rem] bg-[linear-gradient(135deg,#17453a_0%,#1fa892_54%,#55d9c4_100%)] px-8 py-10 text-center text-white shadow-[0_44px_110px_rgb(31_168_146_/_0.24)] transition duration-300 focus:outline-none focus-visible:ring-4 focus-visible:ring-teal-brand/25 active:scale-[0.99] sm:mt-16 sm:rounded-[2.4rem]"
          aria-label={revealed ? 'Ưu đãi chào mừng 50 phần trăm đã mở' : 'Cào thẻ để mở ưu đãi Nutree'}
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
          <span className="absolute left-0 top-1/2 h-14 w-7 -translate-x-1/2 -translate-y-1/2 rounded-r-full bg-[#fbfefc]/80 sm:h-16 sm:w-8" />
          <span className="absolute right-0 top-1/2 h-14 w-7 -translate-y-1/2 translate-x-1/2 rounded-l-full bg-[#fbfefc]/80 sm:h-16 sm:w-8" />
          <span className="absolute inset-0 bg-[radial-gradient(circle_at_32%_28%,rgb(255_255_255_/_0.16),transparent_28%),radial-gradient(circle_at_78%_78%,rgb(255_255_255_/_0.12),transparent_30%)]" />
          <span className="relative mt-5 block text-[0.82rem] font-extrabold uppercase tracking-[0.44em] text-white/85 sm:mt-8 sm:text-[0.98rem]">
            ✨ Nutree Gift ✨
          </span>
          <span className="relative mt-6 block text-[4.75rem] font-extrabold leading-[0.9] tracking-[-0.06em] text-white/90 sm:text-[7rem]">
            -50%
          </span>
          <span className="relative mt-5 block text-[1.15rem] font-extrabold tracking-[-0.02em] text-white/90 sm:text-[1.55rem]">
            Giá chào mừng đã mở
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
              Cào để mở
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

      <div className="mx-auto w-full max-w-lg">
        <button
          type="button"
          onClick={claimGift}
          className="min-h-20 w-full rounded-[1.65rem] bg-forest px-6 text-[1.35rem] font-extrabold tracking-[-0.02em] text-white shadow-[0_18px_38px_rgb(23_69_58_/_0.22)] transition hover:bg-emerald-deep focus:outline-none focus-visible:ring-4 focus-visible:ring-teal-brand/25 active:scale-[0.99] sm:min-h-24 sm:rounded-[2rem]"
        >
          Nhận quà
        </button>
      </div>
    </main>
  );
}
