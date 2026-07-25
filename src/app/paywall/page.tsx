'use client';

import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createCheckout, getFunnelContext } from '@/lib/api/client';
import { trackEvent, trackStepViewed } from '@/lib/analytics/track';
import { useCopy } from '@/lib/copy/use-copy';
import { createFallbackFunnelContext, formatOfferAmount, getRecommendedOffer } from '@/lib/funnel/catalog';
import type { FunnelContext, FunnelOffer } from '@/lib/quiz/types';
import { useHydrated, useQuizStore } from '@/lib/quiz/store';
import { cn } from '@/lib/utils';

const OFFER_SECONDS = 600;

type IconName = 'clipboard' | 'camera' | 'nutrition' | 'activity' | 'coach' | 'goal' | 'person' | 'energy' | 'training';

function FeatureIcon({ name }: { name: IconName }) {
  const common = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  const paths = {
    clipboard: <><rect x="7" y="5" width="10" height="15" rx="2" {...common} /><path d="M10 5.5V4h4v1.5M10 10h4M10 14h4" {...common} /></>,
    camera: <><path d="M5 8h3l1.2-2h5.6L16 8h3v10H5z" {...common} /><circle cx="12" cy="13" r="3.2" {...common} /></>,
    nutrition: <><path d="M7 4v7M5 4v4a2 2 0 0 0 4 0V4M7 11v9M16 4v16M16 4c2.5 1.5 2.5 5 0 6" {...common} /></>,
    activity: <><path d="m4 13 3-3 3 3 4-6 3 3h3" {...common} /><path d="M5 19h14" {...common} /></>,
    coach: <><path d="M5 6.5A3.5 3.5 0 0 1 8.5 3h7A3.5 3.5 0 0 1 19 6.5v6a3.5 3.5 0 0 1-3.5 3.5h-5L6 20v-4.5A3.5 3.5 0 0 1 5 12.5z" {...common} /><path d="M9 9h.01M12 9h.01M15 9h.01" {...common} /></>,
    goal: <><circle cx="12" cy="12" r="7" {...common} /><circle cx="12" cy="12" r="3" {...common} /><path d="m15 9 5-5M16 4h4v4" {...common} /></>,
    person: <><circle cx="12" cy="8" r="3" {...common} /><path d="M5.5 20a6.5 6.5 0 0 1 13 0" {...common} /></>,
    energy: <><path d="m13 2-7 11h5l-1 9 7-12h-5z" {...common} /></>,
    training: <><path d="M7 5h10M6 8h12M8 8v8M16 8v8M5 16h14" {...common} /></>,
  };

  return <svg viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6">{paths[name]}</svg>;
}

function formatCountdown(seconds: number) {
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}

function goalDate(locale: 'vi' | 'en') {
  const date = new Date();
  date.setDate(date.getDate() + 182);
  return new Intl.DateTimeFormat(locale === 'vi' ? 'vi-VN' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
}

export default function PaywallPage() {
  const router = useRouter();
  const copy = useCopy();
  const hydrated = useHydrated();
  const lead = useQuizStore((s) => s.lead);
  const data = useQuizStore((s) => s.data);
  const activeLocale = useQuizStore((s) => s.locale);
  const tdee = useQuizStore((s) => s.tdee);
  const setMomoOrderId = useQuizStore((s) => s.setMomoOrderId);
  const setPayPalCheckout = useQuizStore((s) => s.setPayPalCheckout);
  const [context, setContext] = useState<FunnelContext>(() => createFallbackFunnelContext());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(OFFER_SECONDS);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => trackStepViewed('paywall'), []);
  useEffect(() => {
    const timer = window.setInterval(() => setSecondsLeft((seconds) => Math.max(0, seconds - 1)), 1000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    if (!hydrated) return;
    if (!lead) return router.replace('/email');
    getFunnelContext().then((next) => {
      setContext(next);
      setSelectedId(getRecommendedOffer(next.offers).id);
    }).catch(() => {
      const fallback = createFallbackFunnelContext();
      setContext(fallback);
      setSelectedId(getRecommendedOffer(fallback.offers).id);
    });
  }, [hydrated, lead, router]);

  const selected = useMemo<FunnelOffer>(() => context.offers.find((offer) => offer.id === selectedId) ?? getRecommendedOffer(context.offers), [context.offers, selectedId]);
  if (!hydrated || !lead) return null;

  const targetWeight = Math.round(data.target_weight_kg ?? data.weight_kg ?? 60);
  const currentWeight = Math.round(data.weight_kg ?? targetWeight + 6);
  const targetDate = goalDate(activeLocale);
  const todayAmount = formatOfferAmount(selected.amount_due_today, selected.currency);
  const standardAmount = formatOfferAmount(selected.standard_amount, selected.currency);
  const renewalAmount = formatOfferAmount(selected.renewal_amount, selected.currency);
  const countdown = formatCountdown(secondsLeft);
  const goal = data.fitness_goal === 'bulk' ? copy.paywall.goalBulk : data.fitness_goal === 'maintain' ? copy.paywall.goalMaintain : data.fitness_goal === 'recomp' ? copy.paywall.goalRecomp : copy.paywall.goalCut;
  const gender = data.gender === 'male' ? copy.paywall.genderMale : data.gender === 'female' ? copy.paywall.genderFemale : copy.paywall.genderFallback;

  const beginCheckout = async () => {
    setBusy(true);
    setError(null);
    trackEvent('checkout_started', { provider: context.provider.toLowerCase(), offer_id: selected.id, market: context.market });
    try {
      const checkout = await createCheckout({ leadId: lead.lead_id ?? lead.web_user_id, offer: selected, billingCountry: context.billing_country });
      if (checkout.provider === 'MOMO' && checkout.momo) {
        setMomoOrderId(checkout.momo.orderId);
        window.location.assign(checkout.momo.deeplink || checkout.momo.payUrl);
        return;
      }
      if (checkout.provider === 'PAYPAL' && checkout.paypal) {
        setPayPalCheckout({ ...checkout, offerLabel: selected.label });
        router.push('/checkout');
        return;
      }
      setError(copy.paywall.error);
    } catch {
      setError(copy.paywall.error);
    } finally {
      setBusy(false);
    }
  };

  const benefits = copy.paywall.benefits.map((benefit, index) => ({ ...benefit, icon: (['clipboard', 'camera', 'nutrition', 'activity', 'coach'] as IconName[])[index] }));
  const personalRows = [
    { icon: 'goal' as const, label: copy.paywall.goalLabel, value: goal },
    { icon: 'person' as const, label: copy.paywall.personalizedFor, value: gender },
    { icon: 'energy' as const, label: copy.paywall.calorieLabel, value: tdee ? `${Math.round(tdee.calories).toLocaleString(activeLocale === 'vi' ? 'vi-VN' : 'en-US')} kcal` : copy.paywall.calorieFallback },
    { icon: 'training' as const, label: copy.paywall.activityLabel, value: copy.paywall.activityValue(data.training_days_per_week ?? 0) },
  ];

  return (
    <main className="min-h-dvh bg-[#f6faf8] px-4 pb-[max(2rem,env(safe-area-inset-bottom))] text-charcoal sm:px-6">
      <div className="mx-auto w-full max-w-lg">
        <header className="sticky top-0 z-30 -mx-4 border-b border-[#dce7e2] bg-[#f6faf8]/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
          <div className="mx-auto flex max-w-lg items-center gap-2.5">
            <Image src="/nutree-logo.png" alt="Nutree" width={40} height={40} className="h-9 w-9 object-contain" priority />
            <span className="text-[1.55rem] font-extrabold leading-none tracking-[-0.055em] text-forest">Nut<span className="text-teal-brand">ree</span></span>
            <div className="ml-auto text-right leading-none">
              <p className="text-xs font-bold text-muted-brand"><span className="text-teal-brand">50%</span> {copy.paywall.offerReserved}</p>
              <strong className="mt-1 block text-xl font-extrabold tabular-nums text-forest">{countdown}</strong>
            </div>
          </div>
        </header>

        <div className="pt-6 sm:pt-8">
          <section className="rounded-[2rem] bg-white p-5 shadow-[0_18px_46px_rgb(23_69_58_/_0.08)] sm:p-8">
            <p className="text-center text-lg font-semibold text-slate-brand">{copy.paywall.goalIntro}</p>
            <h1 className="mx-auto mt-1 max-w-2xl text-center text-[2rem] font-extrabold leading-tight tracking-[-0.045em] text-forest sm:text-[2.65rem]">{copy.paywall.goalHeadline(targetWeight, targetDate)}</h1>
            <svg viewBox="0 0 640 245" className="mt-8 h-auto w-full" role="img" aria-label={copy.paywall.goalChartAria}>
              {[48, 181, 314, 447, 580].map((x) => <line key={x} x1={x} y1="20" x2={x} y2="190" stroke="#dce7e2" strokeWidth="2" />)}
              <path d="M48 62 C132 65 156 86 213 130 S304 165 360 168" fill="none" stroke="#a3bd68" strokeWidth="6" strokeLinecap="round" />
              <path d="M360 168 H580" fill="none" stroke="#2d8b70" strokeWidth="6" strokeLinecap="round" />
              <circle cx="48" cy="62" r="9" fill="#d7a84d" /><circle cx="360" cy="168" r="12" fill="#2d8b70" stroke="white" strokeWidth="6" />
              <rect x="304" y="77" width="112" height="67" rx="17" fill="#17453a" /><path d="M348 143 L360 155 L372 143" fill="#17453a" />
              <text x="360" y="103" textAnchor="middle" fill="white" fontSize="16" fontWeight="700">{copy.paywall.goalMarker}</text><text x="360" y="127" textAnchor="middle" fill="white" fontSize="22" fontWeight="800">{targetWeight} kg</text>
              <text x="62" y="52" fill="#6b7b75" fontSize="20" fontWeight="600">{currentWeight} kg</text><text x="48" y="228" fill="#6b7b75" fontSize="17" fontWeight="700">{copy.paywall.now}</text><text x="580" y="228" textAnchor="end" fill="#6b7b75" fontSize="17" fontWeight="700">{targetDate}</text>
            </svg>
            <p className="mx-auto mt-4 max-w-[35rem] text-center text-base leading-relaxed text-muted-brand">{copy.paywall.goalNote}</p>
          </section>

          <section id="plans" className="mt-5 rounded-[2rem] bg-white p-5 shadow-[0_18px_46px_rgb(23_69_58_/_0.08)] sm:mt-6 sm:p-8">
            <h2 className="text-center text-[1.8rem] font-extrabold tracking-[-0.04em] text-forest">{copy.paywall.planTitle}</h2>
            <p className="mt-5 rounded-[1.35rem] bg-[#e8f4ef] px-4 py-4 text-center text-[1.05rem] font-extrabold text-forest tabular-nums">{copy.paywall.offerEnds(countdown)}</p>
            <div role="radiogroup" aria-label={copy.paywall.selectPlanAria} className="mt-5 grid gap-3">
              {context.offers.map((offer) => {
                const active = offer.id === selected.id;
                const daily = offer.amount_due_today / (offer.period_unit === 'YEAR' ? 365 : offer.period_count * 30);
                const standardDaily = offer.standard_amount / (offer.period_unit === 'YEAR' ? 365 : offer.period_count * 30);
                const dailyAmount = offer.currency === 'VND' ? Math.round(daily) : daily;
                const standardDailyAmount = offer.currency === 'VND' ? Math.round(standardDaily) : standardDaily;
                const discountPercent = Math.round(100 - (offer.amount_due_today / offer.standard_amount) * 100);
                const showDiscount = offer.reward_applied && (offer.recommended || offer.period_count > 1 || offer.period_unit === 'YEAR');
                return <button key={offer.id} type="button" role="radio" aria-checked={active} onClick={() => { setSelectedId(offer.id); trackEvent('offer_selected', { offer_id: offer.id, market: offer.market }); }} className={cn('overflow-hidden rounded-[1.55rem] border-2 bg-white text-left transition focus:outline-none focus-visible:ring-4 focus-visible:ring-teal-brand/20 active:scale-[0.99]', active ? 'border-[#ff6a1f] shadow-[0_14px_30px_rgb(255_106_31_/_0.13)]' : 'border-[#dfe7e3] hover:border-teal-brand/60')}>
                  {offer.recommended && <span className="block bg-gradient-to-r from-[#ef4d59] to-[#ff7a1a] px-4 py-2 text-center text-xs font-extrabold uppercase tracking-[0.18em] text-white">{copy.paywall.recommendedTag}</span>}
                  <span className={cn('grid min-h-28 grid-cols-[auto_minmax(4.5rem,1fr)_minmax(3.8rem,auto)_auto] items-center gap-2.5 px-3 py-4 sm:grid-cols-[auto_1fr_auto_auto] sm:gap-4 sm:px-4', active && 'bg-[#fffaf9]')}>
                    <span className={cn('grid h-8 w-8 shrink-0 place-items-center rounded-full border-2', active ? 'border-[#111418]' : 'border-[#c8cfcc]')}>
                      {active && <span className="h-4 w-4 rounded-full bg-forest" />}
                    </span>
                    <span className="min-w-0">
                      <span className={cn('block text-[1.25rem] font-extrabold leading-tight tracking-[-0.035em] sm:text-[1.45rem]', active ? 'text-[#111418]' : 'text-[#666b6a]')}>{offer.label}</span>
                      <span className="mt-1 block text-base font-bold text-muted-brand line-through">{formatOfferAmount(offer.standard_amount, offer.currency)}</span>
                      <span className={cn('block text-[1.15rem] font-extrabold leading-tight tracking-[-0.02em] sm:text-[1.25rem]', active ? 'text-[#111418]' : 'text-[#666b6a]')}>{formatOfferAmount(offer.amount_due_today, offer.currency)}</span>
                    </span>
                    <span className="justify-self-center text-center">
                      {showDiscount && <span className="mb-2 block rounded-lg bg-[#fff0eb] px-2 py-1 text-sm font-extrabold text-[#ff5f2a]">{discountPercent}% OFF</span>}
                      <span className="block text-base font-bold text-muted-brand line-through">{formatOfferAmount(standardDailyAmount, offer.currency)}</span>
                    </span>
                    <span className="min-w-[5.2rem] rounded-[1.15rem] bg-[#f3f4f3] px-2.5 py-3 text-center text-[#111418] shadow-[inset_0_1px_0_rgb(255_255_255_/_0.8)] sm:min-w-[6rem] sm:px-3">
                      <span className="block text-[1.95rem] font-extrabold leading-none tracking-[-0.05em] sm:text-[2.45rem]">{formatOfferAmount(dailyAmount, offer.currency)}</span>
                      <span className="mt-1 block text-xs font-extrabold text-muted-brand">{copy.paywall.perDay}</span>
                    </span>
                  </span>
                </button>;
              })}
            </div>
            <p className="mt-6 text-base leading-relaxed text-slate-brand">{copy.paywall.planRecommendation}</p><p className="mt-2 text-sm font-medium text-muted-brand">{copy.paywall.planResearchNote}</p>
            <button type="button" disabled={busy} onClick={beginCheckout} className="mt-6 min-h-16 w-full rounded-2xl bg-forest px-5 text-lg font-extrabold text-white shadow-[0_14px_28px_rgb(23_69_58_/_0.22)] transition hover:bg-emerald-deep focus:outline-none focus-visible:ring-4 focus-visible:ring-teal-brand/25 active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-50">{busy ? copy.paywall.loading : copy.paywall.cta(targetWeight)}</button>
            <p className="mt-4 text-center text-sm leading-relaxed text-muted-brand">{copy.paywall.exactPriceSummary(standardAmount, todayAmount, renewalAmount)}</p>
          </section>

          <section className="mt-5 rounded-[2rem] bg-white p-5 shadow-[0_18px_46px_rgb(23_69_58_/_0.08)] sm:mt-6 sm:p-8">
            <h2 className="text-[1.75rem] font-extrabold tracking-[-0.04em] text-forest">{copy.paywall.includesTitle}</h2>
            <div className="mt-6 grid gap-5">
              {benefits.map((benefit) => <div key={benefit.title} className="grid grid-cols-[3rem_1fr] gap-4"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-mist text-emerald-deep"><FeatureIcon name={benefit.icon} /></span><div><h3 className="text-lg font-extrabold text-forest">{benefit.title}</h3><p className="mt-0.5 text-base leading-relaxed text-muted-brand">{benefit.body}</p></div></div>)}
            </div>
          </section>

          <section className="mt-5 rounded-[2rem] bg-white p-5 shadow-[0_18px_46px_rgb(23_69_58_/_0.08)] sm:mt-6 sm:p-8">
            <h2 className="text-[1.75rem] font-extrabold tracking-[-0.04em] text-forest">{copy.paywall.personalTitle}</h2>
            <div className="mt-6 grid gap-5">
              {personalRows.map((row) => <div key={row.label} className="grid grid-cols-[3rem_1fr] items-center gap-4"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#edf7f3] text-emerald-deep"><FeatureIcon name={row.icon} /></span><p className="text-base leading-relaxed text-muted-brand">{row.label} <strong className="font-extrabold text-forest">{row.value}</strong></p></div>)}
            </div>
          </section>

          {context.provider === 'PAYPAL' && <p className="mt-5 rounded-2xl bg-white px-4 py-3 text-center text-sm font-semibold leading-relaxed text-muted-brand">{copy.paywall.paypalSummary(todayAmount, selected.renewal_description)}</p>}
          {error && <p role="alert" className="mt-5 rounded-2xl bg-white px-4 py-3 text-sm font-bold text-error-brand">{error}</p>}
          <p className="mx-auto mt-6 max-w-[38rem] px-4 text-center text-xs font-medium leading-relaxed text-muted-brand">{copy.paywall.termsIntro} {copy.paywall.secure}</p>
        </div>
      </div>
    </main>
  );
}
