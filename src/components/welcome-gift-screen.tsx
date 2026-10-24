'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, useReducedMotion } from 'motion/react';
import { CountUp } from '@/components/ui/count-up';
import { NutreeLogo } from '@/components/nutree-logo';
import { ScratchTicketCover } from '@/components/scratch-ticket-cover';
import { trackEvent, trackStepViewed } from '@/lib/analytics/track';
import { useCopy } from '@/lib/copy/use-copy';
import type { OfferClaim } from '@/lib/revenuecat/plan-pricing';

/**
 * The welcome gift before the paywall (both languages): scratch to reveal the welcome price, then claim it.
 * `claim` is the real discount across the plans (null while prices load), so the ticket never
 * promises more than the plans give. Claiming starts the real welcome timer; when it runs out, prices return to full.
 */
const CONFETTI_COLORS = ['#34d0b4', '#f2c14e', '#e8604c', '#ffffff', '#1fa892', '#ff9fb2'];

/** Fixed pseudo-random spread, so the burst looks scattered but renders the same every time. */
const CONFETTI = Array.from({ length: 44 }, (_, index) => {
  const angle = (index / 44) * Math.PI * 2 + (index % 3) * 0.35;
  const distance = 140 + ((index * 37) % 110);
  return {
    x: Math.cos(angle) * distance,
    y: Math.sin(angle) * distance * 0.8 - 40,
    rotate: ((index * 53) % 360) - 180,
    color: CONFETTI_COLORS[index % CONFETTI_COLORS.length],
    round: index % 4 === 0,
    delay: (index % 6) * 0.015,
  };
});

/** The offer text with its percentage counting up, e.g. "Giảm 0% → 50%". */
function OfferText({ text, percent, animate }: { text: string; percent: number | null; animate: boolean }) {
  if (!animate || percent == null) return <>{text}</>;
  const [before, after] = text.split(`${percent}`);
  if (after === undefined) return <>{text}</>;
  return <>{before}<CountUp value={percent} format={(value) => `${Math.round(value)}`} delay={0.15} duration={0.8} />{after}</>;
}

export function WelcomeGiftScreen({ name, claim, ready = true, minutes, variant = 'welcome', onClaim }: {
  name: string | null;
  claim: OfferClaim | null;
  /** False while prices load: the card stays covered and cannot be scratched yet. */
  ready?: boolean;
  minutes: number;
  /** `exit` is the last-chance price after checkout was closed without paying. */
  variant?: 'welcome' | 'exit';
  onClaim: () => void;
}) {
  const copy = useCopy();
  const gift = copy.welcomeGift;
  const revealTriggered = useRef(false);
  const [revealed, setRevealed] = useState(false);
  const reduce = useReducedMotion();
  const celebrate = revealed && !reduce;

  const source = variant === 'exit' ? 'checkout_closed' : 'welcome';

  useEffect(() => trackStepViewed(variant === 'exit' ? 'exit_gift' : 'welcome_gift'), [variant]);

  const finishReveal = () => {
    if (revealTriggered.current || !ready) return;
    revealTriggered.current = true;
    setRevealed(true);
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) navigator.vibrate?.(18);
    trackEvent('welcome_gift_revealed', { discount_percent: claim?.percent, source });
  };

  const claimGift = () => {
    if (!revealed) {
      finishReveal();
      return;
    }
    trackEvent('welcome_gift_claimed', { discount_percent: claim?.percent, source });
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
          <h1 id="welcome-gift-title" className="mx-auto max-w-[20rem] text-[1.9rem] font-extrabold leading-[1.08] tracking-[-0.035em] text-forest [text-wrap:balance]">
            {revealed ? gift.revealedTitle(claim) : variant === 'exit' ? gift.lastChanceHeadline(name) : gift.headline(name)}
          </h1>
          {/* Empty until the reveal, but it keeps its line so the card does not jump. */}
          <p className="mx-auto mt-3 min-h-[1.75rem] max-w-[20rem] text-[1rem] font-semibold leading-relaxed text-slate-brand">
            {revealed ? gift.heldFor(minutes) : null}
          </p>
          <div className="relative mx-auto mt-8 w-[80%] max-w-[19rem]">
          {/* The reveal: a soft glow, a burst of confetti behind the ticket, and the ticket popping forward. */}
          {celebrate && (
            <>
              <motion.span
                aria-hidden="true"
                className="pointer-events-none absolute inset-[-18%] rounded-full bg-[radial-gradient(circle,rgb(52_208_180_/_0.45),transparent_65%)]"
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: [0, 1, 0.55], scale: [0.6, 1.15, 1] }}
                transition={{ duration: 1.1, ease: 'easeOut' }}
              />
              <span aria-hidden="true" className="pointer-events-none absolute left-1/2 top-1/2 z-30">
                {CONFETTI.map((piece, index) => (
                  <motion.span
                    key={index}
                    className={piece.round ? 'absolute h-2.5 w-2.5 rounded-full' : 'absolute h-4 w-2 rounded-[2px]'}
                    style={{ background: piece.color }}
                    initial={{ x: 0, y: 0, opacity: 1, rotate: 0, scale: 0.6 }}
                    animate={{ x: piece.x, y: [0, piece.y, piece.y + 120], opacity: [1, 1, 0], rotate: piece.rotate * 3, scale: 1 }}
                    transition={{ duration: 2, ease: [0.16, 0.84, 0.44, 1], delay: piece.delay, times: [0, 0.4, 1] }}
                  />
                ))}
              </span>
            </>
          )}
          <motion.div
            animate={celebrate ? { scale: [1, 1.1, 0.97, 1.02, 1], rotate: [0, -2, 1.5, 0] } : undefined}
            transition={{ duration: 0.7, ease: 'easeOut' }}
            className="relative flex min-h-[10rem] w-full flex-col items-center justify-center overflow-hidden rounded-[1.5rem] bg-[linear-gradient(135deg,#12473d_0%,#23a890_52%,#63dbc9_100%)] px-6 py-6 text-white shadow-[0_24px_64px_rgb(23_69_58_/_0.22),0_0_0_12px_rgb(229_247_241_/_0.8)]"
            aria-label={revealed ? gift.revealedTitle(claim) : gift.scratchAria}
            role="img"
          >
            <span aria-hidden="true" className="absolute left-0 top-1/2 h-12 w-6 -translate-x-1/2 -translate-y-1/2 rounded-r-full bg-[#eaf6f1]" />
            <span aria-hidden="true" className="absolute right-0 top-1/2 h-12 w-6 -translate-y-1/2 translate-x-1/2 rounded-l-full bg-[#eaf6f1]" />
            {/* The ticket is the percentage alone; the headline above says what it is off. */}
            <span className="relative whitespace-nowrap text-[4.75rem] font-extrabold leading-none tracking-[-0.05em] tabular-nums"><OfferText text={gift.ticketOffer(claim)} percent={claim?.percent ?? null} animate={celebrate} /></span>
            {/* A shine sweeps across once the foil is gone. */}
            {celebrate && (
              <motion.span
                aria-hidden="true"
                className="pointer-events-none absolute inset-y-0 w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-white/45 to-transparent"
                initial={{ left: '-60%' }}
                animate={{ left: '130%' }}
                transition={{ duration: 0.9, delay: 0.35, ease: 'easeInOut' }}
              />
            )}
            <ScratchTicketCover revealed={revealed} disabled={!ready} hint={gift.scratchHint} onScratchStart={() => trackEvent('welcome_reward_scratch_started', {})} onReveal={finishReveal} hintClassName="text-base" />
          </motion.div>
          </div>
        </section>
        <button
          type="button"
          onClick={claimGift}
          disabled={!ready}
          className={`cta-premium disabled:opacity-60 min-h-14 w-full rounded-2xl px-6 text-base font-extrabold text-white transition active:scale-[0.99] focus:outline-none focus-visible:ring-4 focus-visible:ring-teal-brand/30 ${revealed ? 'cta-attention' : ''}`}
        >
          {revealed ? gift.cta(claim) : gift.lockedCta}
        </button>
      </div>
    </div>,
    document.body,
  );
}
