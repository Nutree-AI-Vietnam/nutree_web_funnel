'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ConversionShell } from '@/components/conversion-shell';
import { ScratchTicketCover } from '@/components/scratch-ticket-cover';
import { getFunnelContext, revealWelcomeReward } from '@/lib/api/client';
import { trackEvent, trackStepViewed } from '@/lib/analytics/track';
import { useCopy } from '@/lib/copy/use-copy';
import { createFallbackFunnelContext } from '@/lib/funnel/catalog';
import { getLocalPreviewCountry, isLocalPreviewHost } from '@/lib/local-preview';
import type { FunnelContext } from '@/lib/quiz/types';
import { useHydrated, useQuizStore } from '@/lib/quiz/store';

export default function WelcomeGiftPage() {
  const router = useRouter();
  const copy = useCopy();
  const hydrated = useHydrated();
  const lead = useQuizStore((s) => s.lead);
  const setLocale = useQuizStore((s) => s.setLocale);
  const revealTriggered = useRef(false);
  const [revealed, setRevealed] = useState(false);
  const [context, setContext] = useState<FunnelContext>(() => createFallbackFunnelContext(typeof window !== 'undefined' && isLocalPreviewHost() ? getLocalPreviewCountry() : undefined));

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
          revealTriggered.current = true;
          setRevealed(true);
        }
      })
      .catch(() => {
        const fallback = createFallbackFunnelContext(isLocalPreviewHost() ? getLocalPreviewCountry() : undefined);
        if (isLocalPreviewHost()) setLocale(fallback.locale);
        setContext(fallback);
      });
  }, [hydrated, lead, router, setLocale]);

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
      if (!reduceMotion) navigator.vibrate?.(18);
      trackEvent('welcome_gift_revealed', { discount_percent: 50 });
    };
    revealWelcomeReward(context.session_id, lead.lead_id)
      .then((next) => {
        setContext(next);
        showRevealed();
      })
      .catch(showRevealed);
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
          className="relative mx-auto mt-8 aspect-[2.18/1] w-[calc(100%+1rem)] max-w-[27rem] -translate-x-0 overflow-hidden rounded-[1.55rem] bg-[linear-gradient(135deg,#12473d_0%,#23a890_52%,#63dbc9_100%)] px-6 py-8 text-center text-white shadow-[0_30px_82px_rgb(23_69_58_/_0.20),0_0_0_24px_rgb(229_247_241_/_0.76)] transition duration-300 focus:outline-none focus-visible:ring-4 focus-visible:ring-teal-brand/25 active:scale-[0.99] sm:rounded-[1.75rem]"
          aria-label={revealed ? copy.welcomeGift.ticketAria : copy.welcomeGift.scratchAria}
          role="img"
        >
          <span className="absolute left-0 top-1/2 h-14 w-7 -translate-x-1/2 -translate-y-1/2 rounded-r-full bg-mist/95" />
          <span className="absolute right-0 top-1/2 h-14 w-7 -translate-y-1/2 translate-x-1/2 rounded-l-full bg-mist/95" />
          <span className="absolute inset-0 bg-[radial-gradient(circle_at_35%_35%,rgb(255_255_255_/_0.14),transparent_28%),radial-gradient(circle_at_82%_76%,rgb(255_255_255_/_0.12),transparent_32%)]" />
          <span className="relative mt-2 block text-[0.72rem] font-extrabold uppercase tracking-[0.36em] text-white/88">
            ✨ {copy.welcomeGift.eyebrow} ✨
          </span>
          <span className="relative mt-3 block text-[4.05rem] font-extrabold leading-[0.88] tracking-[-0.055em] text-white/92 sm:text-[4.9rem]">
            {copy.welcomeGift.ticketValue}
          </span>
          <span className="relative mt-3 block text-[1.02rem] font-extrabold tracking-[-0.01em] text-white/90">
            {revealed ? copy.welcomeGift.revealedHeadline : copy.welcomeGift.subhead}
          </span>
          <ScratchTicketCover
            revealed={revealed}
            hint={copy.welcomeGift.scratchHint}
            onScratchStart={() => trackEvent('welcome_reward_scratch_started', {})}
            onReveal={finishReveal}
            hintClassName="text-base"
          />
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
