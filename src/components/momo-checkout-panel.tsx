'use client';

import { useEffect, useRef, useState } from 'react';
import { MomoLogo } from '@/components/momo-logo';
import { trackEvent } from '@/lib/analytics/track';
import type { Copy } from '@/lib/copy';
import { fetchMomoPlans, formatMomoAmount, momoQuoteForWeeks, startMomoCheckout, type MomoPayMethod, type MomoPlanQuote } from '@/lib/payments/momo-checkout';
import { useQuizStore } from '@/lib/quiz/store';

interface MomoCheckoutPanelProps {
  leadId: string;
  locale: 'vi' | 'en';
  copy: Copy['momoCheckout'];
  /** Total line label, shared with the card order lines. */
  totalLabel: string;
  /** Weeks of the plan picked on the paywall; the pass of the same length pays for it. */
  weeks: number | null;
  method: MomoPayMethod;
  disabled: boolean;
  /** The card offer running on the paywall, when it is better than anything MoMo charges. */
  cardOfferPercent: number | null;
  /** True while an order is being created, so the checkout keeps the method and plan on screen. */
  onBusyChange?: (busy: boolean) => void;
  /** Runs just before the browser leaves for MoMo. */
  onLeave?: () => void;
}

/**
 * MoMo inside the shared checkout sheet: the pass for the plan picked on the paywall, as receipt lines,
 * and its pay button. Prices come only from the backend quote: until it loads nothing is priced and Pay
 * stays disabled. The buyer leaves for MoMo only when the order charges the price on screen; otherwise
 * every quote is reloaded, because the backend prices all passes for a buyer at once, and the unpaid order
 * expires. Regular-price quotes mean this lead already paid, so they carry a note telling a buyer who just
 * paid to sign in instead. Checkout errors show the panel's own copy, never upstream text.
 */
export function MomoCheckoutPanel({ leadId, locale, copy, totalLabel, weeks, method, disabled, cardOfferPercent, onBusyChange, onLeave }: MomoCheckoutPanelProps) {
  const setMomoOrderId = useQuizStore((state) => state.setMomoOrderId);
  // Quotes are kept with their lead so another lead never sees them.
  const [quotes, setQuotes] = useState<{ leadId: string; plans: MomoPlanQuote[] } | null>(null);
  const [quoteFailed, setQuoteFailed] = useState(false);
  const [quoteAttempt, setQuoteAttempt] = useState(0);
  const [busy, setBusy] = useState(false);
  const [checkoutFailed, setCheckoutFailed] = useState(false);
  const [pricesUpdated, setPricesUpdated] = useState(false);
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

  useEffect(() => {
    let cancelled = false;
    fetchMomoPlans(leadId).then(
      (plans) => {
        if (cancelled) return;
        setQuotes({ leadId, plans });
        setQuoteFailed(false);
      },
      () => { if (!cancelled) setQuoteFailed(true); },
    );
    return () => { cancelled = true; };
  }, [leadId, quoteAttempt]);

  const plans = quotes?.leadId === leadId ? quotes.plans : null;
  const quote = plans ? momoQuoteForWeeks(plans, weeks) : null;
  const unavailable = Boolean(plans) && !quote;
  const amount = quote ? formatMomoAmount(quote.amount) : null;
  const firstPassSaving = quote && quote.intro && quote.regular_amount > quote.amount ? quote.regular_amount - quote.amount : 0;
  const payLabel = busy
    ? copy.opening
    : amount
      ? (method === 'atm' ? copy.payAtm(amount) : copy.pay(amount))
      : quoteFailed || unavailable ? copy.payUnpriced : copy.loadingPrices;
  const note = pricesUpdated ? copy.pricesUpdated : plans?.some((plan) => !plan.intro) ? copy.justPaid : null;

  const retryQuote = () => {
    setQuoteFailed(false);
    setQuoteAttempt((attempt) => attempt + 1);
  };

  const pay = async () => {
    if (busy || disabled || !quote) return;
    setBusy(true);
    setCheckoutFailed(false);
    setPricesUpdated(false);
    try {
      const started = await startMomoCheckout(quote.plan, method, locale, leadId);
      if (!mountedRef.current) return;
      if (started.amount !== quote.amount) {
        setPricesUpdated(true);
        setQuotes(null);
        setQuoteAttempt((attempt) => attempt + 1);
        setBusy(false);
        return;
      }
      setMomoOrderId(started.orderId);
      trackEvent('momo_checkout_started', { plan: quote.plan, method, value: started.amount, intro: quote.intro, currency: 'VND' });
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
      {/* The pass as receipt lines, like the card order: the full price, the first-pass discount, then the total. */}
      {quote && amount ? (
        <div className="text-[0.95rem] text-slate-brand">
          <p className="flex justify-between gap-3 py-1"><span>{copy.planLine(quote.weeks)}</span><span className="tabular-nums">{formatMomoAmount(firstPassSaving ? quote.regular_amount : quote.amount)}</span></p>
          {firstPassSaving > 0 && (
            <p className="flex justify-between gap-3 py-1"><span>{copy.firstPassDiscount}</span><span className="font-extrabold tabular-nums text-[#e5484d]">−{formatMomoAmount(firstPassSaving)}</span></p>
          )}
          <div className="mt-2.5 border-y border-black/10 py-3 text-charcoal">
            <p className="flex items-baseline justify-between gap-3">
              <span className="font-extrabold">{totalLabel}</span>
              <span className="text-right"><strong className="text-[1.1rem] tabular-nums">{amount}</strong><span className="block text-[0.78rem]">{copy.oneTime}</span></span>
            </p>
          </div>
        </div>
      ) : unavailable && weeks != null ? (
        <p role="status" className="rounded-2xl bg-white px-4 py-3 text-sm font-bold text-slate-brand">{copy.unavailable(weeks)}</p>
      ) : quoteFailed ? (
        <div role="alert" className="flex items-center justify-between gap-3 rounded-2xl bg-[#fff1f2] px-4 py-3 text-sm font-bold text-error-brand">
          <span>{copy.pricesError}</span>
          <button type="button" onClick={retryQuote} className="shrink-0 rounded-full border-2 border-current px-3 py-1 focus:outline-none focus-visible:ring-4 focus-visible:ring-[#a50064]/20">{copy.retryPrices}</button>
        </div>
      ) : (
        <div aria-hidden="true" className="h-[7.5rem] animate-pulse rounded-2xl bg-black/[0.04]" />
      )}
      {cardOfferPercent != null && quote && <p className="mt-3 text-center text-[0.78rem] font-semibold text-muted-brand">{copy.cardOfferOnly(cardOfferPercent)}</p>}
      {note && <p role="status" className="mt-3 rounded-2xl bg-[#FFF7ED] px-4 py-3 text-sm font-bold text-[#9A3412]">{note}</p>}
      <button
        type="button"
        disabled={busy || disabled || !quote}
        onClick={() => { void pay(); }}
        className="mt-4 flex min-h-14 w-full items-center justify-center gap-2.5 rounded-2xl bg-[#a50064] px-5 text-base font-extrabold text-white shadow-[0_14px_28px_rgb(165_0_100_/_0.22)] transition hover:bg-[#8a0054] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#a50064]/25 active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-50"
      >
        <MomoLogo size={26} className="bg-white" />
        <span>{payLabel}</span>
      </button>
      {quote && amount && (
        <p className="mt-3 text-center text-[0.76rem] leading-relaxed text-muted-brand">
          {copy.summary(amount, quote.weeks)}
          {quote.regular_amount !== quote.amount && <> {copy.renewal(formatMomoAmount(quote.regular_amount))}</>}
        </p>
      )}
      {checkoutFailed && <p role="alert" className="mt-3 rounded-2xl bg-[#fff1f2] px-4 py-3 text-sm font-bold text-error-brand">{copy.checkoutError}</p>}
    </div>
  );
}
