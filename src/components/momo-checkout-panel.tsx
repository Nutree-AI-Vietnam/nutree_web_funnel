'use client';

import { useEffect, useRef, useState } from 'react';
import { MomoLogo } from '@/components/momo-logo';
import { trackEvent } from '@/lib/analytics/track';
import type { Copy } from '@/lib/copy';
import { formatMomoAmount, startMomoCheckout, type MomoPayMethod } from '@/lib/payments/momo-checkout';
import { useQuizStore } from '@/lib/quiz/store';

/** The card plan the buyer picked, with the numbers the card checkout shows for it. */
export interface MomoCardPlan {
  /** RevenueCat package the card would buy (the welcome or exit package while an offer runs). */
  packageId: string;
  /** Plan line, as the card's order lines name the plan. */
  label: string;
  weeks: number;
  /** First payment in whole dong: what the pass charges. */
  amount: number;
  /** Full price in whole dong, shown crossed out above the discount when it is higher. */
  fullAmount: number;
  /** The card's discount line ("Giảm 50% chào mừng"), when an offer applies. */
  discountLabel: string | null;
}

interface MomoCheckoutPanelProps {
  leadId: string;
  locale: 'vi' | 'en';
  copy: Copy['momoCheckout'];
  /** Total line label, shared with the card order lines. */
  totalLabel: string;
  plan: MomoCardPlan | null;
  method: MomoPayMethod;
  disabled: boolean;
  /** True while an order is being created, so the checkout keeps the method and plan on screen. */
  onBusyChange?: (busy: boolean) => void;
  /** Runs just before the browser leaves for MoMo. */
  onLeave?: () => void;
}

/**
 * MoMo inside the shared checkout sheet. It uses the card's numbers: the plan picked on the paywall, its full price,
 * the offer's discount and the first payment, as the card's receipt lines show them, paid once for the plan's weeks.
 * The server prices the order from the same Paddle package; when the order charges another amount (prices changed
 * since the page loaded), the buyer stays here and is asked to reload. Errors show the panel's own copy.
 */
export function MomoCheckoutPanel({ leadId, locale, copy, totalLabel, plan, method, disabled, onBusyChange, onLeave }: MomoCheckoutPanelProps) {
  const setMomoOrderId = useQuizStore((state) => state.setMomoOrderId);
  const [busy, setBusy] = useState(false);
  const [checkoutFailed, setCheckoutFailed] = useState(false);
  const [pricesChanged, setPricesChanged] = useState(false);
  // Closing the sheet unmounts the panel while an order may still be in flight.
  const mountedRef = useRef(false);
  const onBusyChangeRef = useRef(onBusyChange);
  useEffect(() => {
    onBusyChangeRef.current = onBusyChange;
  });

  useEffect(() => {
    onBusyChangeRef.current?.(busy);
  }, [busy]);

  useEffect(() => {
    mountedRef.current = true;
    // Safari can restore this page from its back/forward cache after the buyer left for MoMo.
    const leaveBusy = (event: PageTransitionEvent) => { if (event.persisted) setBusy(false); };
    window.addEventListener('pageshow', leaveBusy);
    return () => {
      mountedRef.current = false;
      window.removeEventListener('pageshow', leaveBusy);
      onBusyChangeRef.current?.(false);
    };
  }, []);

  const amount = plan ? formatMomoAmount(plan.amount) : null;
  const discount = plan && plan.fullAmount > plan.amount ? plan.fullAmount - plan.amount : 0;
  const payLabel = busy ? copy.opening : amount ? (method === 'atm' ? copy.payAtm(amount) : copy.pay(amount)) : copy.payUnpriced;

  const pay = async () => {
    if (busy || disabled || !plan || pricesChanged) return;
    setBusy(true);
    setCheckoutFailed(false);
    try {
      const started = await startMomoCheckout(plan.packageId, method, locale, leadId);
      if (!mountedRef.current) return;
      if (started.amount !== plan.amount) {
        setPricesChanged(true);
        setBusy(false);
        return;
      }
      setMomoOrderId(started.orderId);
      trackEvent('momo_checkout_started', { plan: plan.packageId, method, value: started.amount, currency: 'VND' });
      onLeave?.();
      window.location.assign(started.payUrl);
    } catch {
      if (!mountedRef.current) return;
      setBusy(false);
      setCheckoutFailed(true);
    }
  };

  return (
    <div id="momo-checkout" className="mt-4">
      {/* The card's receipt lines for the same plan: the full price, the offer's discount, then the total, paid once. */}
      {plan && amount && (
        <div className="text-[0.95rem] text-slate-brand">
          <p className="flex justify-between gap-3 py-1"><span>{plan.label}</span><span className="tabular-nums">{formatMomoAmount(discount ? plan.fullAmount : plan.amount)}</span></p>
          {discount > 0 && plan.discountLabel && (
            <p className="flex justify-between gap-3 py-1"><span>{plan.discountLabel}</span><span className="font-extrabold tabular-nums text-[#e5484d]">−{formatMomoAmount(discount)}</span></p>
          )}
          <div className="mt-2.5 border-y border-black/10 py-3 text-charcoal">
            <p className="flex items-baseline justify-between gap-3">
              <span className="font-extrabold">{totalLabel}</span>
              <span className="text-right"><strong className="text-[1.1rem] tabular-nums">{amount}</strong><span className="block text-[0.78rem]">{copy.oneTime}</span></span>
            </p>
          </div>
        </div>
      )}
      {pricesChanged && <p role="status" className="mt-3 rounded-2xl bg-[#FFF7ED] px-4 py-3 text-sm font-bold text-[#9A3412]">{copy.pricesUpdated}</p>}
      <button
        type="button"
        disabled={busy || disabled || !plan || pricesChanged}
        onClick={() => { void pay(); }}
        className="mt-4 flex min-h-14 w-full items-center justify-center gap-2.5 rounded-2xl bg-[#a50064] px-5 text-base font-extrabold text-white shadow-[0_14px_28px_rgb(165_0_100_/_0.22)] transition hover:bg-[#8a0054] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#a50064]/25 active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-50"
      >
        <MomoLogo size={26} className="bg-white" />
        <span>{payLabel}</span>
      </button>
      {plan && amount && <p className="mt-3 text-center text-[0.76rem] leading-relaxed text-muted-brand">{copy.summary(amount, plan.weeks)}</p>}
      {checkoutFailed && <p role="alert" className="mt-3 rounded-2xl bg-[#fff1f2] px-4 py-3 text-sm font-bold text-error-brand">{copy.checkoutError}</p>}
    </div>
  );
}
