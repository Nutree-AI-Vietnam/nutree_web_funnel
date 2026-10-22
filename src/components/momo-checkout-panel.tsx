'use client';

import { useEffect, useRef, useState } from 'react';
import { MomoLogo } from '@/components/momo-logo';
import { MomoPlanChoices } from '@/components/momo-plan-choices';
import { trackEvent } from '@/lib/analytics/track';
import { getLeadStatus } from '@/lib/api/client';
import type { Copy } from '@/lib/copy';
import { fetchMomoPlans, formatMomoAmount, MOMO_UNAVAILABLE, startMomoCheckout, type MomoPayMethod, type MomoPlanKey, type MomoPlanQuote } from '@/lib/payments/momo-checkout';
import { cn } from '@/lib/utils';
import { useQuizStore } from '@/lib/quiz/store';
import type { Lead, LeadStatus } from '@/lib/quiz/types';
import { rememberCheckoutMethod } from '@/lib/revenuecat/checkout-email';

interface MomoCheckoutPanelProps {
  leadId: string;
  locale: 'vi' | 'en';
  copy: Copy['momoCheckout'];
  recommendedLabel: string;
  selectPlanAria: string;
  disabled: boolean;
}

/** Lead statuses the paywall answers with the MoMo sign-in hand-off instead of Pay. */
const PAID_LEAD_STATUSES = new Set<LeadStatus>(['payment_verified', 'claimed']);

/**
 * The backend drops the intro price once a pass is paid with the checkout email.
 * When that pass is this lead's own (paid in another tab, or in the browser MoMo
 * returned to), returns the lead so the buyer is not asked to pay again.
 */
async function findPaidLead(leadId: string, plans: MomoPlanQuote[]): Promise<Lead | null> {
  if (plans.every((plan) => plan.intro)) return null;
  const lead = await getLeadStatus(leadId).catch(() => null);
  return lead?.lead_id === leadId && PAID_LEAD_STATUSES.has(lead.status) ? lead : null;
}

/**
 * MoMo one-time pass picker. Prices come only from the backend quote: until it
 * loads nothing is priced and Pay stays disabled. Plan and method stay fixed
 * while the order is created, and the buyer leaves for MoMo only when that order
 * charges the price on screen. A buyer whose email already bought a pass is told
 * so and has to choose to buy another.
 */
export function MomoCheckoutPanel({ leadId, locale, copy, recommendedLabel, selectPlanAria, disabled }: MomoCheckoutPanelProps) {
  const setMomoOrderId = useQuizStore((state) => state.setMomoOrderId);
  const setLead = useQuizStore((state) => state.setLead);
  const setPurchased = useQuizStore((state) => state.setPurchased);
  // Quotes are kept with their lead so another lead never sees them.
  const [quotes, setQuotes] = useState<{ leadId: string; plans: MomoPlanQuote[] } | null>(null);
  const [quoteFailed, setQuoteFailed] = useState(false);
  const [quoteAttempt, setQuoteAttempt] = useState(0);
  const [selected, setSelected] = useState<MomoPlanKey>('quarterly');
  const [method, setMethod] = useState<MomoPayMethod>('wallet');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [priceNotice, setPriceNotice] = useState<string | null>(null);
  // Switching the paywall to card unmounts the panel while an order may still be in flight.
  const mountedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const plans = await fetchMomoPlans(leadId);
      const paidLead = await findPaidLead(leadId, plans);
      if (cancelled) return;
      if (paidLead) {
        // Same steps as a paid MoMo return, so the paywall and post-checkout show the sign-in hand-off.
        rememberCheckoutMethod('momo');
        setPurchased(true);
        setLead(paidLead);
      }
      setQuotes({ leadId, plans });
      setQuoteFailed(false);
    };
    load().catch(() => { if (!cancelled) setQuoteFailed(true); });
    return () => { cancelled = true; };
  }, [leadId, quoteAttempt, setLead, setPurchased]);

  const plans = quotes?.leadId === leadId ? quotes.plans : null;
  const quote = plans ? plans.find((plan) => plan.plan === selected) ?? plans[0] ?? null : null;
  const amount = quote ? formatMomoAmount(quote.amount) : null;
  const paidBefore = plans?.some((plan) => !plan.intro) ?? false;
  const notice = plans && (paidBefore ? copy.paidBefore : priceNotice);
  const payLabel = busy ? copy.opening : amount ? (paidBefore ? copy.payAnother(amount) : copy.pay(amount)) : quoteFailed ? copy.payUnpriced : copy.loadingPrices;

  const retryQuote = () => {
    setQuoteFailed(false);
    setQuoteAttempt((attempt) => attempt + 1);
  };

  const pay = async () => {
    if (busy || disabled || !quote) return;
    setBusy(true);
    setError(null);
    setPriceNotice(null);
    try {
      const started = await startMomoCheckout(quote.plan, method, locale, leadId);
      if (!mountedRef.current) return;
      if (started.amount !== quote.amount) {
        // Reload every quote, which also finds a pass paid with this email meanwhile; the unpaid order expires.
        setPriceNotice(copy.priceChanged(formatMomoAmount(started.amount)));
        setQuotes(null);
        setQuoteAttempt((attempt) => attempt + 1);
        setBusy(false);
        return;
      }
      setMomoOrderId(started.orderId);
      trackEvent('momo_checkout_started', { plan: quote.plan, method, amount: started.amount, intro: quote.intro, currency: 'VND' });
      window.location.assign(started.payUrl);
    } catch (checkoutError) {
      if (!mountedRef.current) return;
      setBusy(false);
      setError(checkoutError instanceof Error ? checkoutError.message : MOMO_UNAVAILABLE);
    }
  };

  return (
    <div id="momo-checkout">
      <div role="radiogroup" aria-label={selectPlanAria} aria-busy={!plans} className="mt-5 grid gap-3">
        {plans
          ? <MomoPlanChoices plans={plans} value={selected} locale={locale} recommendedLabel={recommendedLabel} copy={copy} disabled={busy} onChange={(plan) => { setSelected(plan); setPriceNotice(null); trackEvent('offer_selected', { offer_id: plan, provider: 'momo' }); }} />
          : !quoteFailed && [0, 1, 2].map((index) => <div key={index} aria-hidden="true" className="min-h-[5.6rem] animate-pulse rounded-[1.4rem] border-2 border-[#dfe7e3] bg-[#f6f8f7]" />)}
      </div>
      {!plans && quoteFailed && (
        <div role="alert" className="mt-4 flex items-center justify-between gap-3 rounded-2xl bg-[#fff1f2] px-4 py-3 text-sm font-bold text-error-brand">
          <span>{copy.pricesError}</span>
          <button type="button" onClick={retryQuote} className="shrink-0 rounded-full border-2 border-current px-3 py-1 focus:outline-none focus-visible:ring-4 focus-visible:ring-[#a50064]/20">{copy.retryPrices}</button>
        </div>
      )}
      <div role="radiogroup" aria-label={copy.payWith} className="mt-4 flex items-center justify-center gap-2 text-sm font-bold">
        <span className="text-muted-brand">{copy.payWith}</span>
        {(['wallet', 'atm'] as const).map((option) => (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={method === option}
            disabled={busy}
            onClick={() => setMethod(option)}
            className={cn('min-h-10 rounded-full border-2 px-3.5 transition focus:outline-none focus-visible:ring-4 focus-visible:ring-[#a50064]/20 disabled:cursor-not-allowed disabled:opacity-60', method === option ? 'border-[#a50064] bg-[#fdf2f8] text-[#a50064]' : 'border-[#dfe7e3] bg-white text-slate-brand')}
          >
            {copy[option]}
          </button>
        ))}
      </div>
      {notice && <p role="alert" className="mt-4 rounded-2xl bg-[#FFF7ED] px-4 py-3 text-sm font-bold text-[#9A3412]">{notice}</p>}
      <button
        type="button"
        disabled={busy || disabled || !quote}
        onClick={() => { void pay(); }}
        className="mt-5 flex min-h-14 w-full items-center justify-center gap-2.5 rounded-2xl bg-[#a50064] px-5 text-base font-extrabold text-white shadow-[0_14px_28px_rgb(165_0_100_/_0.22)] transition hover:bg-[#8a0054] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#a50064]/25 active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-50"
      >
        <MomoLogo size={26} className="bg-white" />
        <span>{payLabel}</span>
      </button>
      {quote && amount && (
        <p className="mt-4 text-center text-sm leading-relaxed text-muted-brand">
          {copy.summary(amount, quote.weeks)}
          {quote.regular_amount !== quote.amount && <> {copy.renewal(formatMomoAmount(quote.regular_amount))}</>}
        </p>
      )}
      {error && <p role="alert" className="mt-4 rounded-2xl bg-[#fff1f2] px-4 py-3 text-sm font-bold text-error-brand">{error}</p>}
    </div>
  );
}
