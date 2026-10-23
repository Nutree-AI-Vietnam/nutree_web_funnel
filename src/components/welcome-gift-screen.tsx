'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { NutreeLogo } from '@/components/nutree-logo';
import { ScratchTicketCover } from '@/components/scratch-ticket-cover';
import { trackEvent, trackStepViewed } from '@/lib/analytics/track';
import { useCopy } from '@/lib/copy/use-copy';

/**
 * The welcome gift before the English paywall: scratch to reveal the 50% welcome price, then
 * claim it. Claiming starts the real welcome timer; when it runs out, prices return to full.
 */
export function WelcomeGiftScreen({ minutes, onClaim }: { minutes: number; onClaim: () => void }) {
  const copy = useCopy();
  const gift = copy.welcomeGift;
  const revealTriggered = useRef(false);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => trackStepViewed('welcome_gift'), []);

  const finishReveal = () => {
    if (revealTriggered.current) return;
    revealTriggered.current = true;
    setRevealed(true);
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) navigator.vibrate?.(18);
    trackEvent('welcome_gift_revealed', { discount_percent: 50 });
  };

  const claim = () => {
    if (!revealed) {
      finishReveal();
      return;
    }
    trackEvent('welcome_gift_claimed', { discount_percent: 50 });
    onClaim();
  };

  // Rendered on <body> so it covers the paywall's fixed header.
  return createPortal(
    <div className="fixed inset-0 z-[80] overflow-y-auto bg-[radial-gradient(120%_80%_at_50%_-10%,rgb(52_208_180_/_0.22),transparent_60%),linear-gradient(180deg,#f3faf7,#fafcfb)]" role="dialog" aria-modal="true" aria-labelledby="welcome-gift-title">
      <div className="mx-auto flex min-h-full w-full max-w-lg flex-col px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))]">
        <div className="flex justify-center">
          <NutreeLogo className="h-11 w-11" />
        </div>
        <section className="flex flex-1 flex-col justify-center py-6 text-center">
          <p className="text-sm font-extrabold text-teal-brand">{gift.eyebrow}</p>
          <h1 id="welcome-gift-title" className="mx-auto mt-2 max-w-[20rem] text-[1.9rem] font-extrabold leading-[1.08] tracking-[-0.035em] text-forest [text-wrap:balance]">
            {revealed ? gift.revealedHeadline : gift.headline}
          </h1>
          <p className="mx-auto mt-3 max-w-[20rem] text-[1rem] font-semibold leading-relaxed text-slate-brand">
            {revealed ? gift.heldFor(minutes) : gift.subhead}
          </p>
          <div
            className="relative mx-auto mt-8 flex min-h-[10rem] w-[80%] max-w-[19rem] flex-col items-center justify-center overflow-hidden rounded-[1.5rem] bg-[linear-gradient(135deg,#12473d_0%,#23a890_52%,#63dbc9_100%)] px-6 py-6 text-white shadow-[0_24px_64px_rgb(23_69_58_/_0.22),0_0_0_12px_rgb(229_247_241_/_0.8)]"
            aria-label={revealed ? gift.ticketAria : gift.scratchAria}
            role="img"
          >
            <span aria-hidden="true" className="absolute left-0 top-1/2 h-12 w-6 -translate-x-1/2 -translate-y-1/2 rounded-r-full bg-[#eaf6f1]" />
            <span aria-hidden="true" className="absolute right-0 top-1/2 h-12 w-6 -translate-y-1/2 translate-x-1/2 rounded-l-full bg-[#eaf6f1]" />
            <span className="relative text-[0.72rem] font-extrabold tracking-[0.08em] text-white/85">{gift.ticketLabel}</span>
            <span className="relative mt-2 whitespace-nowrap text-[2.5rem] font-extrabold leading-none tracking-[-0.05em]">{gift.ticketValue}</span>
            <span className="relative mt-2 text-[0.85rem] font-bold text-white/90">{gift.ticketNote}</span>
            <ScratchTicketCover revealed={revealed} hint={gift.scratchHint} onScratchStart={() => trackEvent('welcome_reward_scratch_started', {})} onReveal={finishReveal} hintClassName="text-base" />
          </div>
        </section>
        <button
          type="button"
          onClick={claim}
          className="cta-premium min-h-14 w-full rounded-2xl px-6 text-base font-extrabold text-white transition active:scale-[0.99] focus:outline-none focus-visible:ring-4 focus-visible:ring-teal-brand/30"
        >
          {revealed ? gift.cta : gift.lockedCta}
        </button>
      </div>
    </div>,
    document.body,
  );
}
