'use client';

import { initializePaddle, type Paddle, type PricePreviewResponse } from '@paddle/paddle-js';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ConversionShell } from '@/components/conversion-shell';
import { ScratchTicketCover } from '@/components/scratch-ticket-cover';
import { trackEvent, trackStepViewed } from '@/lib/analytics/track';
import { useCopy } from '@/lib/copy/use-copy';
import { getLocalPreviewCountry, isLocalPreviewHost, localPreviewData, localPreviewLead, localPreviewTdee } from '@/lib/local-preview';
import { normalizePaddleCountryCode } from '@/lib/paddle/country';
import { readPaddleClientConfig } from '@/lib/paddle/env';
import { paddleExitDiscountId, paddlePaywallDiscountId, paddlePaywallPlans, type PaywallPlan } from '@/lib/paddle/paywall-plans';
import { useHydrated, useQuizStore } from '@/lib/quiz/store';
import { cn } from '@/lib/utils';

interface PaywallPageClientProps {
  initialCountryCode?: string;
}

type LoadState = 'idle' | 'loading' | 'ready' | 'error';
type FormattedPrices = Record<string, string>;

const OFFER_SECONDS = 600;
const benefitEmoji = ['📋', '📸', '🍽️', '🔥', '💬'];

function formatCountdown(seconds: number) {
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}

function goalDate(locale: 'vi' | 'en') {
  const date = new Date();
  date.setDate(date.getDate() + 182);
  return new Intl.DateTimeFormat(locale === 'vi' ? 'vi-VN' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
}

function mapFormattedTotals(preview: PricePreviewResponse): FormattedPrices {
  return Object.fromEntries(
    preview.data.details.lineItems.map((lineItem) => [lineItem.price.id, lineItem.formattedTotals.total]),
  );
}

export function PaywallPageClient({ initialCountryCode }: PaywallPageClientProps) {
  const router = useRouter();
  const copy = useCopy();
  const hydrated = useHydrated();
  const lead = useQuizStore((state) => state.lead);
  const data = useQuizStore((state) => state.data);
  const activeLocale = useQuizStore((state) => state.locale);
  const tdee = useQuizStore((state) => state.tdee);
  const setData = useQuizStore((state) => state.setData);
  const setLead = useQuizStore((state) => state.setLead);
  const setLocale = useQuizStore((state) => state.setLocale);
  const setTdee = useQuizStore((state) => state.setTdee);
  const [selectedId, setSelectedId] = useState<PaywallPlan['id']>('12-week');
  const [secondsLeft, setSecondsLeft] = useState(OFFER_SECONDS);
  const [paddle, setPaddle] = useState<Paddle | null>(null);
  const [introPrices, setIntroPrices] = useState<FormattedPrices>({});
  const [renewalPrices, setRenewalPrices] = useState<FormattedPrices>({});
  const [loadState, setLoadState] = useState<LoadState>('idle');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [discountId, setDiscountId] = useState(paddlePaywallDiscountId);
  const [showCheckoutConfirm, setShowCheckoutConfirm] = useState(false);
  const [showExitOffer, setShowExitOffer] = useState(false);
  const [exitOfferRevealed, setExitOfferRevealed] = useState(false);
  const checkoutIsOpenRef = useRef(false);
  const exitOfferShownRef = useRef(false);
  const discountIdRef = useRef(discountId);
  const onCheckoutClosedRef = useRef<() => void>(() => undefined);

  const countryCode = initialCountryCode ?? (isLocalPreviewHost() ? normalizePaddleCountryCode(getLocalPreviewCountry()) : undefined);
  const selected = useMemo(
    () => paddlePaywallPlans.find((plan) => plan.id === selectedId) ?? paddlePaywallPlans[1],
    [selectedId],
  );
  const discountPercent = discountId === paddleExitDiscountId ? 75 : 50;
  const isExitDiscount = discountId === paddleExitDiscountId;

  useEffect(() => {
    discountIdRef.current = discountId;
    onCheckoutClosedRef.current = () => {
      setBusy(false);
    if (secondsLeft <= 0 || exitOfferShownRef.current || discountIdRef.current === paddleExitDiscountId) return;
    exitOfferShownRef.current = true;
    setExitOfferRevealed(false);
    setShowExitOffer(true);
      trackEvent('paddle_exit_offer_shown', { plan: selected.id, discount_percent: 75 });
    };
  }, [discountId, secondsLeft, selected.id]);

  useEffect(() => trackStepViewed('paywall'), []);

  useEffect(() => {
    const timer = window.setInterval(() => setSecondsLeft((seconds) => Math.max(0, seconds - 1)), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!hydrated || lead) return;
    if (!isLocalPreviewHost()) {
      router.replace('/email');
      return;
    }
    setData(localPreviewData);
    setLead(localPreviewLead);
    setLocale(countryCode === 'VN' ? 'vi' : 'en');
    setTdee(localPreviewTdee, 'fallback');
  }, [countryCode, hydrated, lead, router, setData, setLead, setLocale, setTdee]);

  useEffect(() => {
    let cancelled = false;

    async function loadPaddle() {
      try {
        const config = readPaddleClientConfig();
        const instance = await initializePaddle({
          token: config.token,
          ...(config.environment === 'sandbox' ? { environment: 'sandbox' as const } : {}),
          eventCallback: (event) => {
            if (event.name === 'checkout.completed') checkoutIsOpenRef.current = false;
            if (event.name === 'checkout.closed' && checkoutIsOpenRef.current) {
              checkoutIsOpenRef.current = false;
              onCheckoutClosedRef.current();
            }
          },
        });
        if (!instance) throw new Error('Paddle.js did not return an initialized instance.');
        if (!cancelled) setPaddle(instance);
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Unable to initialize Paddle.');
          setLoadState('error');
        }
      }
    }

    loadPaddle();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!paddle) return;
    const paddleInstance: Paddle = paddle;
    let cancelled = false;

    async function loadPrices() {
      setLoadState('loading');
      setError(null);
      const items = paddlePaywallPlans.map((plan) => ({ priceId: plan.priceId, quantity: 1 }));
      const address = countryCode ? { address: { countryCode } } : {};

      try {
        const [introPreview, renewalPreview] = await Promise.all([
          paddleInstance.PricePreview({ items, discountId, ...address }),
          paddleInstance.PricePreview({ items, ...address }),
        ]);
        if (!cancelled) {
          setIntroPrices(mapFormattedTotals(introPreview));
          setRenewalPrices(mapFormattedTotals(renewalPreview));
          setLoadState('ready');
        }
      } catch {
        if (!cancelled) {
          setLoadState('error');
          setError('Paddle could not preview prices for this visitor. Check the client token and catalog IDs.');
        }
      }
    }

    loadPrices();
    return () => { cancelled = true; };
  }, [countryCode, discountId, paddle]);

  const openCheckout = (nextDiscountId = discountId) => {
    if (!paddle || !lead) {
      setError('Paddle is still loading. Please try again in a moment.');
      return;
    }
    setBusy(true);
    setError(null);
    setDiscountId(nextDiscountId);
    checkoutIsOpenRef.current = true;
    trackEvent('paddle_checkout_started', { plan: selected.id, price_id: selected.priceId, country_code: countryCode ?? 'auto', discount_percent: nextDiscountId === paddleExitDiscountId ? 75 : 50 });

    try {
      paddle.Checkout.open({
        items: [{ priceId: selected.priceId, quantity: 1 }],
        discountId: nextDiscountId,
        customer: { email: lead.email },
        customData: {
          source: 'nutree_web_paywall',
          plan: selected.id,
          web_user_id: lead.web_user_id,
        },
        settings: {
          displayMode: 'overlay',
          variant: 'one-page',
          successUrl: `${window.location.origin}/welcome`,
        },
      });
    } catch {
      checkoutIsOpenRef.current = false;
      setError('Paddle could not open checkout. Check the checkout domain and default payment link.');
    } finally {
      window.setTimeout(() => setBusy(false), 1500);
    }
  };

  const requestCheckout = () => {
    if (!paddle || !lead || !pricesReady) {
      setError('Paddle is still loading. Please try again in a moment.');
      return;
    }
    setError(null);
    setShowCheckoutConfirm(true);
  };

  const targetWeight = Math.round(data.target_weight_kg ?? data.weight_kg ?? 60);
  const currentWeight = Math.round(data.weight_kg ?? targetWeight + 6);
  const targetDate = goalDate(activeLocale);
  const countdown = formatCountdown(secondsLeft);
  const goal = data.fitness_goal === 'bulk' ? copy.paywall.goalBulk : data.fitness_goal === 'maintain' ? copy.paywall.goalMaintain : data.fitness_goal === 'recomp' ? copy.paywall.goalRecomp : copy.paywall.goalCut;
  const gender = data.gender === 'male' ? copy.paywall.genderMale : data.gender === 'female' ? copy.paywall.genderFemale : copy.paywall.genderFallback;
  const benefits = copy.paywall.benefits.map((benefit, index) => ({ ...benefit, icon: benefitEmoji[index] ?? '✅' }));
  const personalRows = [
    { icon: '🔥', label: copy.paywall.goalLabel, value: goal },
    { icon: '🎯', label: copy.paywall.personalizedFor, value: gender },
    { icon: '🥦', label: copy.paywall.calorieLabel, value: tdee ? `${Math.round(tdee.calories).toLocaleString(activeLocale === 'vi' ? 'vi-VN' : 'en-US')} kcal` : copy.paywall.calorieFallback },
    { icon: '🚶', label: copy.paywall.activityLabel, value: copy.paywall.activityValue(data.training_days_per_week ?? 0) },
  ];
  const introTotal = introPrices[selected.priceId] ?? '…';
  const renewalTotal = renewalPrices[selected.priceId] ?? '…';
  const pricesReady = loadState === 'ready';
  const exitOfferCopy = activeLocale === 'vi'
    ? { eyebrow: 'Ưu đãi độc quyền', title: 'Cào để mở giảm 75%', body: 'Cào thẻ để mở giá ưu đãi cho kỳ thanh toán đầu tiên.', hint: 'Cào để mở ưu đãi 75%', reveal: 'Mở ưu đãi 75%', claim: 'Nhận ưu đãi 75%', dismiss: 'Không, cảm ơn' }
    : { eyebrow: 'Exclusive offer', title: 'Scratch to unlock 75% off', body: 'Scratch the card to reveal your first-billing offer.', hint: 'Scratch to unlock 75% off', reveal: 'Reveal 75% off', claim: 'Claim 75% off', dismiss: 'No thanks' };
  const confirmCopy = activeLocale === 'vi'
    ? { title: 'Xác nhận gói của bạn', body: 'Bạn sẽ mở thanh toán bảo mật của Paddle cho gói đã chọn.', continue: 'Tiếp tục thanh toán', dismiss: 'Quay lại' }
    : { title: 'Confirm your plan', body: 'You’ll open Paddle’s secure checkout for the plan you selected.', continue: 'Continue to checkout', dismiss: 'Go back' };

  return (
    <ConversionShell
      hideLogo
      stickyHeader={(
        <div className="fixed left-1/2 top-0 z-50 w-full max-w-lg -translate-x-1/2 border-b border-white/55 bg-white/70 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] shadow-[0_12px_34px_rgb(16_39_32_/_0.12)] backdrop-blur-xl supports-[backdrop-filter]:bg-white/60">
          <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3">
            <Link href="/" aria-label="Nutree" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/70 bg-white/75 shadow-[inset_0_0_0_1px_rgb(255_255_255_/_0.5),0_2px_8px_rgb(16_39_32_/_0.06)] backdrop-blur"><Image src="/nutree-logo-simple.png" alt="" width={72} height={64} priority className="h-7 w-7 object-contain" /></Link>
            <div><p className="text-[0.74rem] font-bold leading-tight text-muted-brand"><span className="text-[0.92rem] font-extrabold text-teal-brand">{discountPercent}%</span> {copy.paywall.offerReserved}</p><strong className="mt-0.5 block text-[1.2rem] font-extrabold leading-none tracking-[-0.035em] text-[#111418] tabular-nums">{countdown}</strong></div>
            <button type="button" disabled={!pricesReady || busy} onClick={requestCheckout} className="min-h-10 rounded-[1rem] bg-forest px-3.5 text-[0.78rem] font-extrabold text-white shadow-[0_10px_24px_rgb(23_69_58_/_0.20)] transition hover:bg-emerald-deep focus:outline-none focus-visible:ring-4 focus-visible:ring-teal-brand/25 active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-50 sm:px-4 sm:text-[0.86rem]">{busy ? copy.paywall.loading : copy.paywall.topCta}</button>
          </div>
        </div>
      )}
      className="gap-5"
    >
      <div className="pt-[5.75rem]">
        <section className="rounded-[2rem] bg-white p-5 shadow-[0_18px_46px_rgb(23_69_58_/_0.08)] sm:p-8">
          <p className="text-center text-[0.92rem] font-semibold text-slate-brand">{copy.paywall.goalIntro}</p>
          <h1 className="mx-auto mt-1 max-w-2xl text-center text-[1.28rem] font-extrabold leading-tight tracking-[-0.03em] text-forest sm:text-[1.55rem]">{copy.paywall.goalHeadline(targetWeight, targetDate)}</h1>
          <svg viewBox="0 0 640 245" className="mt-8 h-auto w-full" role="img" aria-label={copy.paywall.goalChartAria}><path d="M48 62 C132 65 156 86 213 130 S304 165 360 168" fill="none" stroke="#a3bd68" strokeWidth="6" strokeLinecap="round" /><path d="M360 168 H580" fill="none" stroke="#2d8b70" strokeWidth="6" strokeLinecap="round" /><circle cx="48" cy="62" r="9" fill="#d7a84d" /><circle cx="360" cy="168" r="12" fill="#2d8b70" stroke="white" strokeWidth="6" /><text x="62" y="52" fill="#6b7b75" fontSize="20" fontWeight="600">{currentWeight} kg</text><text x="48" y="228" fill="#6b7b75" fontSize="17" fontWeight="700">{copy.paywall.now}</text><text x="580" y="228" textAnchor="end" fill="#6b7b75" fontSize="17" fontWeight="700">{targetDate}</text></svg>
          <p className="mx-auto mt-4 max-w-[35rem] text-center text-[0.9rem] leading-relaxed text-muted-brand">{copy.paywall.goalNote}</p>
        </section>

        <section className="mt-5 rounded-[2rem] bg-white p-3.5 shadow-[0_18px_46px_rgb(23_69_58_/_0.08)] sm:mt-6 sm:p-5">
          <h2 className="text-center text-[1.08rem] font-extrabold tracking-[-0.02em] text-forest sm:text-[1.18rem]">{copy.paywall.planTitle}</h2>
          <p className="mt-4 rounded-[1.15rem] bg-[#e8f4ef] px-3 py-2.5 text-center text-[0.84rem] font-extrabold text-forest tabular-nums">{secondsLeft > 0 ? copy.paywall.offerEnds(countdown) : activeLocale === 'vi' ? 'Ưu đãi đã kết thúc' : 'Offer ended'}</p>
          <div role="radiogroup" aria-label={copy.paywall.selectPlanAria} className="mt-5 grid gap-3">
            {paddlePaywallPlans.map((plan) => {
              const active = plan.id === selected.id;
              const intro = introPrices[plan.priceId] ?? '…';
              const renewal = renewalPrices[plan.priceId] ?? '…';
              return <button key={plan.id} type="button" role="radio" aria-checked={active} onClick={() => { setSelectedId(plan.id); trackEvent('offer_selected', { offer_id: plan.id, provider: 'paddle' }); }} className={cn('overflow-hidden rounded-[1.4rem] border-2 bg-white text-left transition focus:outline-none focus-visible:ring-4 focus-visible:ring-teal-brand/20 active:scale-[0.99]', active ? 'border-[#ff5b1f] shadow-[0_12px_26px_rgb(255_106_31_/_0.10)]' : 'border-[#dfe7e3] hover:border-teal-brand/60')}>
                {plan.recommended && <span className="block bg-gradient-to-r from-[#ef4d59] to-[#ff781f] px-3 py-1.5 text-center text-[0.62rem] font-extrabold uppercase tracking-[0.18em] text-white">{copy.paywall.recommendedTag}</span>}
                <span className={cn('grid min-h-[5.25rem] grid-cols-[auto_1fr_auto] items-center gap-3 px-3 py-3', active && 'bg-[#fffafa]')}><span className={cn('grid h-6 w-6 place-items-center rounded-full border-2', active ? 'border-[#111418]' : 'border-[#c8cfcc]')}>{active && <span className="h-3 w-3 rounded-full bg-forest" />}</span><span><span className={cn('block text-[0.98rem] font-extrabold', active ? 'text-[#111418]' : 'text-[#5f6764]')}>{plan.label[activeLocale]}</span><span className="mt-1 block text-[0.76rem] font-semibold text-muted-brand">{plan.description[activeLocale]}</span><span className="mt-2 block text-[0.78rem] font-bold text-muted-brand line-through">{renewal}</span></span><span className="min-w-[5.2rem] rounded-[0.9rem] bg-[#f2f2f1] px-2 py-2 text-center text-[#111418]"><span className="block text-[1.38rem] font-extrabold leading-none tracking-[-0.04em]">{intro}</span><span className="mt-1 block text-[0.58rem] font-extrabold leading-none text-muted-brand">{plan.billingLabel[activeLocale]}</span></span></span>
              </button>;
            })}
          </div>
          <p className="mt-5 text-[0.94rem] leading-relaxed text-slate-brand">{copy.paywall.planRecommendation}</p>
          <p className="mt-1.5 text-sm font-medium text-muted-brand">{isExitDiscount ? (activeLocale === 'vi' ? 'Ưu đãi EXIT75 đã được áp dụng cho kỳ thanh toán đầu tiên.' : 'Your EXIT75 offer is applied to the first billing period.') : copy.paywall.planResearchNote}</p>
          <button type="button" disabled={!pricesReady || busy} onClick={requestCheckout} className="mt-5 min-h-14 w-full rounded-2xl bg-forest px-5 text-base font-extrabold text-white shadow-[0_14px_28px_rgb(23_69_58_/_0.22)] transition hover:bg-emerald-deep focus:outline-none focus-visible:ring-4 focus-visible:ring-teal-brand/25 active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-50">{busy ? copy.paywall.loading : copy.paywall.cta()}</button>
          <p className="mt-4 text-center text-sm leading-relaxed text-muted-brand">{copy.paywall.exactPriceSummary(renewalTotal, introTotal, renewalTotal, selected.label[activeLocale])}</p>
        </section>

        <section className="mt-5 rounded-[2rem] bg-white p-5 shadow-[0_18px_46px_rgb(23_69_58_/_0.08)] sm:mt-6 sm:p-8"><h2 className="text-[1.2rem] font-extrabold tracking-[-0.03em] text-forest">{copy.paywall.includesTitle}</h2><div className="mt-5 grid gap-4">{benefits.map((benefit) => <div key={benefit.title} className="grid grid-cols-[2.55rem_1fr] gap-3"><span className="grid h-10 w-10 place-items-center rounded-2xl bg-mist text-[1.1rem]" aria-hidden="true">{benefit.icon}</span><div><h3 className="text-[0.92rem] font-extrabold text-forest">{benefit.title}</h3><p className="mt-0.5 text-[0.84rem] leading-relaxed text-muted-brand">{benefit.body}</p></div></div>)}</div></section>
        <section className="mt-5 rounded-[2rem] bg-white p-5 shadow-[0_18px_46px_rgb(23_69_58_/_0.08)] sm:mt-6 sm:p-8"><h2 className="text-[1.2rem] font-extrabold tracking-[-0.03em] text-forest">{copy.paywall.personalTitle}</h2><div className="mt-5 grid gap-4">{personalRows.map((row) => <div key={row.label} className="grid grid-cols-[2.55rem_1fr] items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-2xl bg-[#edf7f3] text-[1.1rem]" aria-hidden="true">{row.icon}</span><p className="text-[0.86rem] leading-relaxed text-muted-brand">{row.label} <strong className="font-extrabold text-forest">{row.value}</strong></p></div>)}</div></section>
        <section className="mt-5 rounded-[2rem] bg-white p-5 text-center shadow-[0_18px_46px_rgb(23_69_58_/_0.08)] sm:mt-6 sm:p-8"><Image src="/guarantee-30day.webp" alt="" width={160} height={160} className="mx-auto h-28 w-28 object-contain" /><h2 className="mt-3 text-[1.16rem] font-extrabold leading-tight tracking-[-0.025em] text-[#111418]">{copy.paywall.guaranteeTitle}</h2><p className="mt-3 text-[0.84rem] font-medium leading-relaxed text-muted-brand">{copy.paywall.guaranteeBody}</p></section>
        {error && <p role="alert" className="mt-5 rounded-2xl bg-white px-4 py-3 text-sm font-bold text-error-brand">{error}</p>}
        <p className="mx-auto mt-6 max-w-[38rem] px-4 text-center text-xs font-medium leading-relaxed text-muted-brand">{copy.paywall.termsIntro} {copy.paywall.secure}</p>
      </div>
      {showCheckoutConfirm && (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-[#111816]/52 px-5 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="checkout-confirm-title">
          <section className="w-full max-w-sm rounded-[2rem] bg-white p-7 text-center shadow-[0_28px_80px_rgb(10_18_16_/_0.34)]">
            <h2 id="checkout-confirm-title" className="text-2xl font-extrabold tracking-[-0.04em] text-forest">{confirmCopy.title}</h2>
            <p className="mt-3 text-sm font-medium leading-relaxed text-muted-brand">{confirmCopy.body}</p>
            <div className="mt-5 rounded-2xl bg-mist px-4 py-3 text-left"><p className="font-extrabold text-forest">{selected.label[activeLocale]}</p><p className="mt-1 text-sm font-bold text-slate-brand">{introTotal} {activeLocale === 'vi' ? 'hôm nay' : 'today'}</p><p className="mt-1 text-xs font-semibold text-muted-brand">{renewalTotal} {selected.billingLabel[activeLocale]}</p></div>
            <button type="button" onClick={() => { setShowCheckoutConfirm(false); openCheckout(); }} className="mt-6 min-h-13 w-full rounded-2xl bg-forest px-5 font-extrabold text-white transition hover:bg-emerald-deep focus:outline-none focus-visible:ring-4 focus-visible:ring-teal-brand/25">{confirmCopy.continue}</button>
            <button type="button" onClick={() => setShowCheckoutConfirm(false)} className="mt-3 min-h-11 w-full text-sm font-bold text-muted-brand underline underline-offset-4">{confirmCopy.dismiss}</button>
          </section>
        </div>
      )}
      {showExitOffer && (
        <div className="fixed inset-0 z-[70] overflow-y-auto bg-mist" role="dialog" aria-modal="true" aria-labelledby="exit-offer-title">
          <ConversionShell hideLogo className="min-h-dvh justify-center gap-8 py-10 text-center">
            <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-teal-brand">{exitOfferCopy.eyebrow}</p>
            <h2 id="exit-offer-title" className="text-[clamp(2.4rem,12vw,4.25rem)] font-extrabold leading-none tracking-[-0.07em] text-forest">75% OFF</h2>
            <p className="mx-auto max-w-sm text-lg font-extrabold text-[#111418]">{exitOfferCopy.title}</p>
            <p className="mx-auto max-w-sm text-sm font-medium leading-relaxed text-muted-brand">{exitOfferCopy.body}</p>
            <div className="relative mx-auto aspect-[2.18/1] w-full max-w-[27rem] overflow-hidden rounded-[1.75rem] bg-[linear-gradient(135deg,#12473d_0%,#23a890_52%,#63dbc9_100%)] px-6 py-8 text-white shadow-[0_30px_82px_rgb(23_69_58_/_0.20),0_0_0_20px_rgb(229_247_241_/_0.76)]">
              <span className="absolute inset-0 bg-[radial-gradient(circle_at_35%_35%,rgb(255_255_255_/_0.14),transparent_28%),radial-gradient(circle_at_82%_76%,rgb(255_255_255_/_0.12),transparent_32%)]" aria-hidden="true" />
              <span className="relative block text-xs font-extrabold uppercase tracking-[0.34em] text-white/85">{exitOfferCopy.eyebrow}</span>
              <span className="relative mt-4 block text-6xl font-extrabold leading-none tracking-[-0.07em]">75%</span>
              <span className="relative mt-2 block text-base font-extrabold">OFF</span>
              <ScratchTicketCover revealed={exitOfferRevealed} hint={exitOfferCopy.hint} onScratchStart={() => trackEvent('paddle_exit_offer_scratch_started', { plan: selected.id })} onReveal={() => { setExitOfferRevealed(true); trackEvent('paddle_exit_offer_revealed', { plan: selected.id, discount_percent: 75 }); }} hintClassName="text-base" />
            </div>
            <button type="button" onClick={() => { if (!exitOfferRevealed) { setExitOfferRevealed(true); trackEvent('paddle_exit_offer_revealed', { plan: selected.id, discount_percent: 75 }); return; } setShowExitOffer(false); trackEvent('paddle_exit_offer_claimed', { plan: selected.id, discount_percent: 75 }); openCheckout(paddleExitDiscountId); }} className="min-h-14 w-full max-w-[27rem] rounded-2xl bg-forest px-5 font-extrabold text-white transition hover:bg-emerald-deep focus:outline-none focus-visible:ring-4 focus-visible:ring-teal-brand/25">{exitOfferRevealed ? exitOfferCopy.claim : exitOfferCopy.reveal}</button>
            <button type="button" onClick={() => setShowExitOffer(false)} className="mt-3 min-h-11 w-full text-sm font-bold text-muted-brand underline underline-offset-4">{exitOfferCopy.dismiss}</button>
          </ConversionShell>
        </div>
      )}
    </ConversionShell>
  );
}
