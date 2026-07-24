'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ConversionShell } from '@/components/conversion-shell';
import { PrimaryButton } from '@/components/primary-button';
import { createMomoSubscriptionCheckout } from '@/lib/api/client';
import { trackEvent, trackStepViewed } from '@/lib/analytics/track';
import { useCopy } from '@/lib/copy/use-copy';
import { useHydrated, useQuizStore } from '@/lib/quiz/store';
import { cn } from '@/lib/utils';

const formatVnd = (value: number) => `${value.toLocaleString('vi-VN')}đ`;
const RESCUE_GIFT_KEY = 'paywall:showRescueGift';

export default function PaywallPage() {
  const router = useRouter();
  const vi = useCopy();
  const hydrated = useHydrated();
  const lead = useQuizStore((s) => s.lead);
  const setMomoOrderId = useQuizStore((s) => s.setMomoOrderId);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [giftUnlocked, setGiftUnlocked] = useState(
    () => typeof window !== 'undefined' && window.sessionStorage.getItem(RESCUE_GIFT_KEY) === '1',
  );
  const defaultPlan = vi.paywall.plans.find((p) => p.recommended) ?? vi.paywall.plans[0];
  const [selectedId, setSelectedId] = useState<string>(defaultPlan.id);

  useEffect(() => trackStepViewed('paywall'), []);

  useEffect(() => {
    if (giftUnlocked) trackEvent('paywall_rescue_gift_viewed', {});
  }, [giftUnlocked]);

  if (!hydrated) return null;

  const selected = vi.paywall.plans.find((p) => p.id === selectedId) ?? defaultPlan;
  const displayTotal = giftUnlocked ? selected.finalTotal : selected.total;
  // Mental accounting: reframe the monthly cost as a tiny daily number.
  const perDay = Math.round(displayTotal / selected.periodDays / 100) * 100;

  const buy = async () => {
    // Checkout needs a saved lead; if the user skipped email, send them back to capture it first.
    if (!lead) {
      router.push('/email');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      window.sessionStorage.setItem(RESCUE_GIFT_KEY, '1');
      const checkout = await createMomoSubscriptionCheckout(lead.web_user_id, selected.id);
      setMomoOrderId(checkout.order_id);
      trackEvent('checkout_started_client', {
        provider: 'momo',
        plan_id: selected.id,
        offer_price: displayTotal,
        rescue_gift: giftUnlocked,
      });
      window.location.assign(checkout.pay_url);
    } catch {
      setError(vi.paywall.paymentError);
      setGiftUnlocked(true);
      window.sessionStorage.setItem(RESCUE_GIFT_KEY, '1');
      trackEvent('paywall_rescue_gift_viewed', { reason: 'checkout_error' });
      setBusy(false);
    }
  };

  return (
    <ConversionShell className="gap-5">
      <header className="px-1 text-center">
        <div className="mb-4 rounded-3xl bg-white/86 p-4 text-left shadow-[inset_0_0_0_1px_rgb(255_255_255_/_0.72),0_10px_28px_rgb(16_39_32_/_0.08)] backdrop-blur">
          <p className="text-sm font-bold text-muted-brand">
            <span className="text-error-brand">{vi.paywall.timer.discount}</span> {vi.paywall.timer.reserved}
          </p>
          <div className="mt-1 flex items-center justify-between gap-3">
            <p className="text-4xl font-black leading-none text-forest">
              {giftUnlocked ? vi.paywall.timer.finalTime : vi.paywall.timer.time}
            </p>
            <button
              type="button"
              onClick={() => void buy()}
              disabled={busy}
              className="min-h-12 shrink-0 rounded-2xl bg-[#ef4e5d] px-5 text-sm font-extrabold text-white shadow-[0_10px_24px_rgb(239_78_93_/_0.22)] transition hover:-translate-y-0.5 focus:outline-none focus-visible:ring-4 focus-visible:ring-error-brand/25 disabled:opacity-50"
            >
              {busy ? vi.paywall.loading : vi.paywall.topCta}
            </button>
          </div>
        </div>

        <div className="rounded-[2rem] bg-white/88 p-5 shadow-[0_18px_55px_rgb(16_39_32_/_0.08)]">
          <p className="text-sm font-extrabold uppercase tracking-[0.2em] text-teal-brand">
            {giftUnlocked ? vi.paywall.finalGiftEyebrow : vi.paywall.eyebrow}
          </p>
          <h1 className="mt-3 text-[2rem] font-extrabold leading-[1.1] tracking-tight text-forest [text-wrap:balance]">
            {vi.paywall.headline}
          </h1>
          <p className="mt-2 text-sm font-semibold leading-relaxed text-muted-brand">
            {giftUnlocked ? vi.paywall.finalSubhead : vi.paywall.subhead}
          </p>
          <div className="mt-5 rounded-2xl bg-[#fff0f1] px-4 py-3 text-center text-sm font-extrabold text-error-brand">
            {giftUnlocked ? vi.paywall.finalOfferBanner : vi.paywall.offerBanner}
          </div>
        </div>
      </header>

      <div role="radiogroup" aria-label={vi.paywall.selectPlanAria} className="flex flex-col gap-3">
        {vi.paywall.plans.map((plan) => {
          const active = plan.id === selectedId;
          return (
            <button
              key={plan.id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setSelectedId(plan.id)}
              className={cn(
                'group relative flex items-center gap-4 rounded-2xl bg-white/78 px-4 py-4 text-left backdrop-blur transition-all duration-300 active:scale-[0.99]',
                active
                  ? 'shadow-[inset_0_0_0_2px_rgb(31_168_146_/_0.9),0_10px_28px_rgb(31_168_146_/_0.15)]'
                  : 'shadow-[inset_0_0_0_1px_rgb(255_255_255_/_0.5),0_2px_10px_rgb(16_39_32_/_0.06)] hover:-translate-y-px',
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  'grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 transition-colors duration-300',
                  active ? 'border-teal-brand bg-teal-brand text-white' : 'border-border-brand bg-white text-transparent',
                )}
              >
                <span className="h-2 w-2 rounded-full bg-white" />
              </span>

              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="text-base font-extrabold text-forest">{plan.label}</span>
                  {plan.badge && (
                    <span className="rounded-full bg-[#fff0f1] px-2 py-0.5 text-[0.62rem] font-extrabold uppercase tracking-wide text-error-brand">
                      {plan.badge}
                    </span>
                  )}
                </span>
                <span className="mt-1 block text-xs font-semibold text-muted-brand">
                  <span className="line-through">{formatVnd(plan.originalTotal)}</span>
                  <span className="mx-1.5">→</span>
                  <span className={cn('font-extrabold text-forest', giftUnlocked && 'line-through')}>
                    {formatVnd(plan.total)}
                  </span>
                  {giftUnlocked && (
                    <span className="ml-1.5 font-extrabold text-error-brand">
                      {formatVnd(plan.finalTotal)}
                    </span>
                  )}
                </span>
              </span>

              <span className="shrink-0 text-right">
                <span className="text-lg font-extrabold leading-none text-forest">
                  {(giftUnlocked ? plan.finalTotal : plan.total).toLocaleString('vi-VN')}
                </span>
                <span className="block text-[0.68rem] font-bold text-muted-brand">{plan.cadence}</span>
              </span>

              {plan.recommended && (
                <span className="absolute -top-2.5 right-4 rounded-full bg-[linear-gradient(135deg,#1c5546,#0f2c23)] px-2.5 py-0.5 text-[0.6rem] font-extrabold uppercase tracking-wide text-white shadow-sm">
                  {vi.paywall.recommendedTag}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <ul className="flex flex-col gap-2">
        {vi.paywall.bullets.map((b) => (
          <li key={b} className="flex items-center gap-3 text-sm font-semibold text-slate-brand">
            <span
              aria-hidden="true"
              className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,#34d0b4,#1fa892)] text-[0.7rem] text-white shadow-[0_3px_8px_rgb(31_168_146_/_0.35)]"
            >
              ✓
            </span>
            {b}
          </li>
        ))}
      </ul>

      {error && (
        <p className="text-sm font-medium text-error-brand" role="alert">
          {error}
        </p>
      )}

      <p className="text-center text-xs font-semibold text-slate-brand">{vi.paywall.socialProof}</p>

      <div className="sticky bottom-3 mt-auto flex flex-col gap-2 pt-1">
        <PrimaryButton disabled={busy} onClick={buy}>
          {busy
            ? vi.paywall.loading
            : `${giftUnlocked ? vi.paywall.finalCtaPrefix : vi.paywall.ctaPrefix} ${selected.label}`}
        </PrimaryButton>
        <p className="text-center text-xs font-bold text-teal-brand">
          {vi.paywall.perDayNote(perDay.toLocaleString('vi-VN'))}
        </p>
        <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-muted-brand">
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" aria-hidden="true">
            <path
              d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinejoin="round"
            />
            <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {vi.paywall.secure}
        </div>
        <p className="text-center text-[0.7rem] leading-relaxed text-muted-brand/80">{vi.paywall.finePrint}</p>
      </div>
    </ConversionShell>
  );
}
