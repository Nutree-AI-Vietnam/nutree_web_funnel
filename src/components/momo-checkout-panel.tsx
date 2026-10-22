'use client';

import { useEffect, useState } from 'react';
import { MomoLogo } from '@/components/momo-logo';
import { MomoPlanChoices } from '@/components/momo-plan-choices';
import { trackEvent } from '@/lib/analytics/track';
import type { Copy } from '@/lib/copy';
import { DEFAULT_MOMO_PLANS, fetchMomoPlans, formatMomoAmount, startMomoCheckout, type MomoPayMethod, type MomoPlanKey, type MomoPlanQuote } from '@/lib/payments/momo-checkout';
import { cn } from '@/lib/utils';
import { useQuizStore } from '@/lib/quiz/store';
import { rememberCheckoutMethod } from '@/lib/revenuecat/checkout-email';

interface MomoCheckoutPanelProps {
  leadId: string;
  locale: 'vi' | 'en';
  copy: Copy['momoCheckout'];
  recommendedLabel: string;
  selectPlanAria: string;
  disabled: boolean;
}

/** MoMo one-time pass picker. The backend prices the order and MoMo shows the final amount. */
export function MomoCheckoutPanel({ leadId, locale, copy, recommendedLabel, selectPlanAria, disabled }: MomoCheckoutPanelProps) {
  const setMomoOrderId = useQuizStore((state) => state.setMomoOrderId);
  const [plans, setPlans] = useState<MomoPlanQuote[]>(DEFAULT_MOMO_PLANS);
  const [selected, setSelected] = useState<MomoPlanKey>('quarterly');
  const [method, setMethod] = useState<MomoPayMethod>('wallet');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchMomoPlans(leadId)
      .then((quotes) => { if (!cancelled) setPlans(quotes); })
      .catch(() => { /* Keep intro prices; the order is priced by the backend. */ });
    return () => { cancelled = true; };
  }, [leadId]);

  const quote = plans.find((plan) => plan.plan === selected) ?? plans[0]!;
  const amount = formatMomoAmount(quote.amount);

  const pay = async () => {
    if (busy || disabled) return;
    setBusy(true);
    setError(null);
    try {
      const started = await startMomoCheckout(quote.plan, method, locale, leadId);
      rememberCheckoutMethod('momo');
      setMomoOrderId(started.orderId);
      trackEvent('momo_checkout_started', { plan: quote.plan, method, amount: quote.amount, intro: quote.intro, currency: 'VND' });
      window.location.assign(started.payUrl);
    } catch (checkoutError) {
      setBusy(false);
      setError(checkoutError instanceof Error ? checkoutError.message : 'MoMo checkout is unavailable.');
    }
  };

  return (
    <div id="momo-checkout">
      <div role="radiogroup" aria-label={selectPlanAria} className="mt-5 grid gap-3">
        <MomoPlanChoices plans={plans} value={selected} locale={locale} recommendedLabel={recommendedLabel} copy={copy} onChange={(plan) => { setSelected(plan); trackEvent('offer_selected', { offer_id: plan, provider: 'momo' }); }} />
      </div>
      <div role="radiogroup" aria-label={copy.payWith} className="mt-4 flex items-center justify-center gap-2 text-sm font-bold">
        <span className="text-muted-brand">{copy.payWith}</span>
        {(['wallet', 'atm'] as const).map((option) => (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={method === option}
            onClick={() => setMethod(option)}
            className={cn('min-h-10 rounded-full border-2 px-3.5 transition focus:outline-none focus-visible:ring-4 focus-visible:ring-[#a50064]/20', method === option ? 'border-[#a50064] bg-[#fdf2f8] text-[#a50064]' : 'border-[#dfe7e3] bg-white text-slate-brand')}
          >
            {copy[option]}
          </button>
        ))}
      </div>
      <button
        type="button"
        disabled={busy || disabled}
        onClick={() => { void pay(); }}
        className="mt-5 flex min-h-14 w-full items-center justify-center gap-2.5 rounded-2xl bg-[#a50064] px-5 text-base font-extrabold text-white shadow-[0_14px_28px_rgb(165_0_100_/_0.22)] transition hover:bg-[#8a0054] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#a50064]/25 active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-50"
      >
        <MomoLogo size={26} className="bg-white" />
        <span>{busy ? copy.opening : copy.pay(amount)}</span>
      </button>
      <p className="mt-4 text-center text-sm leading-relaxed text-muted-brand">
        {copy.summary(amount, quote.weeks)}
        {quote.regular_amount !== quote.amount && <> {copy.renewal(formatMomoAmount(quote.regular_amount))}</>}
      </p>
      {error && <p role="alert" className="mt-4 rounded-2xl bg-[#fff1f2] px-4 py-3 text-sm font-bold text-error-brand">{error}</p>}
    </div>
  );
}
