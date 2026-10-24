'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ScratchTicketCover } from '@/components/scratch-ticket-cover';
import { trackEvent } from '@/lib/analytics/track';
import { useCopy } from '@/lib/copy/use-copy';

/**
 * Intercepts leaving the paywall and keeps the welcome voucher on screen
 * until it is claimed. A browser can still close after its own confirmation;
 * if the page stays, the voucher is what the person sees next.
 */
export function PaywallExitVoucher({ armed, onClaimed }: { armed: boolean; onClaimed: () => void }) {
  const copy = useCopy();
  const [open, setOpen] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const revealedRef = useRef(false);
  const pendingExit = useRef(false);
  const historyArmed = useRef(false);

  // Disarming closes the voucher; adjusted during render rather than in an effect.
  const [wasArmed, setWasArmed] = useState(armed);
  if (armed !== wasArmed) {
    setWasArmed(armed);
    if (!armed) setOpen(false);
  }

  useEffect(() => {
    if (!armed) return;
    const show = () => setOpen(true);
    const rememberExit = () => {
      pendingExit.current = true;
    };
    const showRememberedExit = () => {
      if (!pendingExit.current) return;
      pendingExit.current = false;
      show();
    };
    const onMouseLeave = (event: MouseEvent) => {
      if (event.clientY <= 0) show();
    };
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') rememberExit();
      else showRememberedExit();
    };
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      rememberExit();
      event.preventDefault();
      event.returnValue = '';
    };
    const onPopState = () => {
      show();
      window.history.pushState({ nutreePaywallGuard: true }, '');
    };

    document.documentElement.addEventListener('mouseleave', onMouseLeave);
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('blur', rememberExit);
    window.addEventListener('focus', showRememberedExit);
    window.addEventListener('beforeunload', onBeforeUnload);
    window.addEventListener('pagehide', rememberExit);
    window.addEventListener('pageshow', showRememberedExit);
    if (!historyArmed.current) {
      historyArmed.current = true;
      window.history.pushState({ nutreePaywallGuard: true }, '');
    }
    window.addEventListener('popstate', onPopState);
    return () => {
      document.documentElement.removeEventListener('mouseleave', onMouseLeave);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('blur', rememberExit);
      window.removeEventListener('focus', showRememberedExit);
      window.removeEventListener('beforeunload', onBeforeUnload);
      window.removeEventListener('pagehide', rememberExit);
      window.removeEventListener('pageshow', showRememberedExit);
      window.removeEventListener('popstate', onPopState);
    };
  }, [armed]);

  useEffect(() => {
    if (open) trackEvent('welcome_voucher_exit_shown', {});
  }, [open]);

  if (!open || typeof document === 'undefined') return null;

  const finishReveal = () => {
    if (revealedRef.current) return;
    revealedRef.current = true;
    setRevealed(true);
    trackEvent('welcome_gift_revealed', { discount_percent: 50, source: 'exit' });
  };
  const continueWithOffer = () => {
    if (!revealed) {
      finishReveal();
      return;
    }
    trackEvent('welcome_gift_claimed', { discount_percent: 50, source: 'exit' });
    onClaimed();
    setOpen(false);
  };

  return createPortal(
    <div className="fixed inset-0 z-[70] grid place-items-end bg-[#111816]/58 px-4 py-4 backdrop-blur-sm sm:place-items-center" role="dialog" aria-modal="true" aria-labelledby="exit-voucher-title">
      <section className="w-full max-w-sm rounded-[2rem] bg-white p-6 text-center shadow-[0_28px_80px_rgb(10_18_16_/_0.34)]">
        <p className="text-[0.72rem] font-extrabold tracking-[0.02em] text-teal-brand">{copy.welcomeGift.eyebrow}</p>
        <h2 id="exit-voucher-title" className="mt-2 text-[1.45rem] font-extrabold leading-tight tracking-[-0.03em] text-forest">{revealed ? copy.welcomeGift.revealedHeadline : copy.welcomeGift.exitHeadline}</h2>
        <p className="mt-2 text-sm font-semibold leading-relaxed text-muted-brand">{revealed ? copy.welcomeGift.exitContinueHint : copy.welcomeGift.exitSubhead}</p>
        <div className="relative mx-auto mt-5 flex min-h-[8.5rem] w-full flex-col items-center justify-center overflow-hidden rounded-[1.3rem] bg-[linear-gradient(135deg,#12473d_0%,#23a890_52%,#63dbc9_100%)] px-5 py-5 text-white" aria-label={revealed ? copy.welcomeGift.ticketAria : copy.welcomeGift.scratchAria} role="img">
          <span className="text-[0.66rem] font-extrabold tracking-[0.02em] text-white/85">{copy.welcomeGift.ticketLabel}</span>
          <span className="mt-2 text-[2.4rem] font-extrabold leading-none tracking-[-0.04em]">{copy.welcomeGift.ticketValue}</span>
          <ScratchTicketCover revealed={revealed} hint={copy.welcomeGift.scratchHint} onReveal={finishReveal} hintClassName="text-sm" />
        </div>
        <button type="button" onClick={continueWithOffer} className="mt-5 min-h-14 w-full rounded-2xl bg-forest px-5 text-base font-extrabold text-white transition hover:bg-emerald-deep focus:outline-none focus-visible:ring-4 focus-visible:ring-teal-brand/25">
          {revealed ? copy.welcomeGift.exitContinue : copy.welcomeGift.lockedCta}
        </button>
      </section>
    </div>,
    document.body,
  );
}
