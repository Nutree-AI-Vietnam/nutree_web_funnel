'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { ConversionShell } from '@/components/conversion-shell';
import { createCheckout, getFunnelContext } from '@/lib/api/client';
import { trackEvent, trackStepViewed } from '@/lib/analytics/track';
import { useCopy } from '@/lib/copy/use-copy';
import { createFallbackFunnelContext, formatOfferAmount, getRecommendedOffer } from '@/lib/funnel/catalog';
import { isLocalPreviewHost, localPreviewData, localPreviewLead, localPreviewTdee, useLocalPreviewHost } from '@/lib/local-preview';
import type { FunnelContext, FunnelOffer } from '@/lib/quiz/types';
import { useHydrated, useQuizStore } from '@/lib/quiz/store';
import { cn } from '@/lib/utils';

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

function offerPeriodDays(offer: FunnelOffer) {
  if (offer.period_unit === 'YEAR' || offer.label.includes('52')) return 364;
  if (offer.label.includes('12')) return 84;
  return 28;
}

export default function PaywallPage() {
  const router = useRouter();
  const copy = useCopy();
  const hydrated = useHydrated();
  const lead = useQuizStore((s) => s.lead);
  const data = useQuizStore((s) => s.data);
  const activeLocale = useQuizStore((s) => s.locale);
  const tdee = useQuizStore((s) => s.tdee);
  const setData = useQuizStore((s) => s.setData);
  const setLead = useQuizStore((s) => s.setLead);
  const setTdee = useQuizStore((s) => s.setTdee);
  const setMomoOrderId = useQuizStore((s) => s.setMomoOrderId);
  const setPayPalCheckout = useQuizStore((s) => s.setPayPalCheckout);
  const [context, setContext] = useState<FunnelContext>(() => createFallbackFunnelContext());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(OFFER_SECONDS);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [localCheckoutOpen, setLocalCheckoutOpen] = useState(false);
  const [localCheckoutDismissed, setLocalCheckoutDismissed] = useState(false);
  const [showLastOffer, setShowLastOffer] = useState(false);
  const [lastOfferRevealed, setLastOfferRevealed] = useState(false);
  const [lastOfferScratchProgress, setLastOfferScratchProgress] = useState(0);
  const lastOfferTicketRef = useRef<HTMLDivElement>(null);
  const localPreview = useLocalPreviewHost();
  const localCheckoutRequested = localPreview && !localCheckoutDismissed && typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('localCheckout') === '1';
  const showLocalCheckout = localCheckoutOpen || localCheckoutRequested;
  const lockPageScroll = showLocalCheckout || showLastOffer;

  useEffect(() => trackStepViewed('paywall'), []);
  useEffect(() => {
    const timer = window.setInterval(() => setSecondsLeft((seconds) => Math.max(0, seconds - 1)), 1000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    if (!lockPageScroll) return undefined;
    const scrollY = window.scrollY;
    const previousOverflow = document.body.style.overflow;
    const previousPosition = document.body.style.position;
    const previousTop = document.body.style.top;
    const previousWidth = document.body.style.width;

    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';

    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.position = previousPosition;
      document.body.style.top = previousTop;
      document.body.style.width = previousWidth;
      window.scrollTo(0, scrollY);
    };
  }, [lockPageScroll]);
  useEffect(() => {
    if (!hydrated) return;
    if (!lead) {
      if (isLocalPreviewHost()) {
        setData(localPreviewData);
        setLead(localPreviewLead);
        setTdee(localPreviewTdee, 'fallback');
      } else {
        router.replace('/email');
      }
      return;
    }
    getFunnelContext().then((next) => {
      setContext(next);
      setSelectedId(getRecommendedOffer(next.offers).id);
    }).catch(() => {
      const fallback = createFallbackFunnelContext();
      setContext(fallback);
      setSelectedId(getRecommendedOffer(fallback.offers).id);
    });
  }, [hydrated, lead, router, setData, setLead, setTdee]);

  const selected = useMemo<FunnelOffer>(() => context.offers.find((offer) => offer.id === selectedId) ?? getRecommendedOffer(context.offers), [context.offers, selectedId]);
  if (!hydrated || (!lead && !localPreview)) return null;

  const targetWeight = Math.round(data.target_weight_kg ?? data.weight_kg ?? 60);
  const currentWeight = Math.round(data.weight_kg ?? targetWeight + 6);
  const targetDate = goalDate(activeLocale);
  const todayAmount = formatOfferAmount(selected.amount_due_today, selected.currency);
  const standardAmount = formatOfferAmount(selected.standard_amount, selected.currency);
  const renewalAmount = formatOfferAmount(selected.renewal_amount, selected.currency);
  const discountAmount = formatOfferAmount(selected.standard_amount - selected.amount_due_today, selected.currency);
  const countdown = formatCountdown(secondsLeft);
  const goal = data.fitness_goal === 'bulk' ? copy.paywall.goalBulk : data.fitness_goal === 'maintain' ? copy.paywall.goalMaintain : data.fitness_goal === 'recomp' ? copy.paywall.goalRecomp : copy.paywall.goalCut;
  const gender = data.gender === 'male' ? copy.paywall.genderMale : data.gender === 'female' ? copy.paywall.genderFemale : copy.paywall.genderFallback;
  const checkoutProvider = selected.provider === 'MOMO' ? 'MoMo' : 'PayPal';
  const localCheckoutCopy = activeLocale === 'vi'
    ? {
      paymentReuse: 'Nutree sẽ dùng thông tin thanh toán này cho các kỳ gia hạn sau.',
      methodTitle: 'Chọn phương thức thanh toán',
      oneClick: 'Thanh toán một chạm',
      safer: 'Cách an toàn, dễ dàng hơn để thanh toán',
      quickPay: `Thanh toán an toàn với ${checkoutProvider}`,
      card: 'Thẻ tín dụng',
      encryption: 'Thông tin thanh toán được bảo vệ bằng mã hóa SSL/TLS',
      guarantee: 'Đảm bảo hoàn tiền trong 30 ngày',
      period: `cho kỳ đầu tiên: ${selected.label}`,
      planSubscription: `Gói ${selected.label}`,
      providerButton: `Thanh toán với ${checkoutProvider}`,
      discountLabel: 'Ưu đãi chào mừng 50%',
      lastOfferTitle: 'Ưu đãi cuối dành cho bạn',
      lastOfferSubtitle: 'Vé ưu đãi tiếp theo đã mở',
      lastOfferEyebrow: 'Ưu đãi độc quyền',
      lastOfferUnlocked: 'Ưu đãi độc quyền đã mở cho bạn',
      lastOfferScratchHint: 'Cào để mở ưu đãi 75%',
      lastOfferCta: 'Claim reward',
    }
    : {
      paymentReuse: 'Nutree will use your payment details for seamless future payments.',
      methodTitle: 'Select a payment method',
      oneClick: 'One-click payment',
      safer: 'The safer, easier way to pay',
      quickPay: `Pay securely with ${checkoutProvider}`,
      card: 'Credit Card',
      encryption: 'Your payment information is protected by SSL/TLS encryption',
      guarantee: '30-day money-back guarantee',
      period: `for the first ${selected.label}`,
      planSubscription: `${selected.label} plan subscription`,
      providerButton: checkoutProvider,
      discountLabel: '50% introductory price discount',
      lastOfferTitle: 'One last offer for you',
      lastOfferSubtitle: 'Scratch the ticket to reveal your offer',
      lastOfferEyebrow: 'Exclusive offer',
      lastOfferUnlocked: 'Exclusive offer unlocked for you',
      lastOfferScratchHint: 'Scratch to unlock 75% off',
      lastOfferCta: 'Claim reward',
    };

  const finishLastOfferReveal = () => {
    if (lastOfferRevealed) return;
    setLastOfferRevealed(true);
    setLastOfferScratchProgress(100);
    if (typeof window !== 'undefined') {
      window.navigator.vibrate?.(18);
    }
    trackEvent('local_last_offer_revealed', { offer_id: selected.id, market: selected.market });
  };

  const updateLastOfferScratch = (clientX: number) => {
    const rect = lastOfferTicketRef.current?.getBoundingClientRect();
    if (!rect || lastOfferRevealed) return;
    const nextProgress = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
    setLastOfferScratchProgress((current) => {
      const progress = Math.max(current, nextProgress);
      if (progress >= 74) window.setTimeout(finishLastOfferReveal, 100);
      return progress;
    });
  };

  const closeLocalCheckout = () => {
    setLocalCheckoutOpen(false);
    setLocalCheckoutDismissed(true);
    setShowLastOffer(true);
    setLastOfferRevealed(false);
    setLastOfferScratchProgress(0);
    trackEvent('local_checkout_sheet_closed', { offer_id: selected.id, market: selected.market });
    if (typeof window !== 'undefined' && window.location.search.includes('localCheckout=1')) {
      window.history.replaceState(null, '', '/paywall');
    }
  };

  const beginCheckout = async () => {
    if (isLocalPreviewHost()) {
      setShowLastOffer(false);
      setLocalCheckoutOpen(true);
      trackEvent('local_checkout_sheet_opened', { offer_id: selected.id, market: selected.market });
      return;
    }
    if (!lead) {
      router.replace('/email');
      return;
    }
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

  const benefits = copy.paywall.benefits.map((benefit, index) => ({ ...benefit, icon: benefitEmoji[index] ?? '✅' }));
  const personalRows = [
    { icon: '🔥', label: copy.paywall.goalLabel, value: goal },
    { icon: '🎯', label: copy.paywall.personalizedFor, value: gender },
    { icon: '🥦', label: copy.paywall.calorieLabel, value: tdee ? `${Math.round(tdee.calories).toLocaleString(activeLocale === 'vi' ? 'vi-VN' : 'en-US')} kcal` : copy.paywall.calorieFallback },
    { icon: '🚶', label: copy.paywall.activityLabel, value: copy.paywall.activityValue(data.training_days_per_week ?? 0) },
  ];

  const renderPlanSection = (id: string, title: string) => (
    <section id={id} className="mt-5 rounded-[2rem] bg-white p-3.5 shadow-[0_18px_46px_rgb(23_69_58_/_0.08)] sm:mt-6 sm:p-5">
      <h2 className="text-center text-[1.08rem] font-extrabold tracking-[-0.02em] text-forest sm:text-[1.18rem]">{title}</h2>
      <p className="mt-4 rounded-[1.15rem] bg-[#e8f4ef] px-3 py-2.5 text-center text-[0.84rem] font-extrabold text-forest tabular-nums">{copy.paywall.offerEnds(countdown)}</p>
      <div role="radiogroup" aria-label={copy.paywall.selectPlanAria} className="mt-5 grid gap-3">
        {context.offers.map((offer) => {
          const active = offer.id === selected.id;
          const periodDays = offerPeriodDays(offer);
          const dailyAmount = offer.currency === 'VND' ? Math.round(offer.amount_due_today / periodDays) : offer.amount_due_today / periodDays;
          const standardDailyAmount = offer.currency === 'VND' ? Math.round(offer.standard_amount / periodDays) : offer.standard_amount / periodDays;
          const discountPercent = Math.round(100 - (offer.amount_due_today / offer.standard_amount) * 100);
          const showDiscount = offer.reward_applied && (offer.recommended || offer.period_count > 1 || offer.period_unit === 'YEAR');
          return (
            <button
              key={`${id}-${offer.id}`}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => {
                setSelectedId(offer.id);
                trackEvent('offer_selected', { offer_id: offer.id, market: offer.market });
              }}
              className={cn('overflow-hidden rounded-[1.4rem] border-2 bg-white text-left transition focus:outline-none focus-visible:ring-4 focus-visible:ring-teal-brand/20 active:scale-[0.99]', active ? 'border-[#ff5b1f] shadow-[0_12px_26px_rgb(255_106_31_/_0.10)]' : 'border-[#dfe7e3] hover:border-teal-brand/60')}
            >
              {offer.recommended && <span className="block bg-gradient-to-r from-[#ef4d59] to-[#ff781f] px-3 py-1.5 text-center text-[0.62rem] font-extrabold uppercase tracking-[0.18em] text-white">{copy.paywall.recommendedTag}</span>}
              <span className={cn('grid min-h-[4.85rem] grid-cols-[auto_minmax(5.15rem,1fr)_minmax(3.25rem,auto)_auto] items-center gap-2 px-3 py-2.5 sm:grid-cols-[auto_minmax(6.25rem,1fr)_auto_auto]', active && 'bg-[#fffafa]')}>
                <span className={cn('grid h-6 w-6 shrink-0 place-items-center rounded-full border-2', active ? 'border-[#111418]' : 'border-[#c8cfcc]')}>
                  {active && <span className="h-3 w-3 rounded-full bg-forest" />}
                </span>
                <span className="min-w-0 self-center">
                  <span className={cn('block text-[0.9rem] font-extrabold leading-[1.05] tracking-[-0.02em] sm:text-[0.98rem]', active ? 'text-[#111418]' : 'text-[#5f6764]')}>{offer.label}</span>
                  <span className="mt-1.5 block text-[0.74rem] font-bold leading-tight text-muted-brand line-through">{formatOfferAmount(offer.standard_amount, offer.currency)}</span>
                  <span className={cn('mt-1 block text-[0.84rem] font-extrabold leading-tight tracking-[-0.01em]', active ? 'text-[#111418]' : 'text-[#5f6764]')}>{formatOfferAmount(offer.amount_due_today, offer.currency)}</span>
                </span>
                <span className="grid justify-items-center gap-1">
                  {showDiscount && <span className="rounded-lg bg-[#fff0eb] px-2 py-1 text-[0.64rem] font-extrabold leading-none text-[#ff5f2a]">{copy.paywall.discountTag(discountPercent)}</span>}
                  <span className="text-[0.74rem] font-bold leading-tight text-muted-brand line-through">{formatOfferAmount(standardDailyAmount, offer.currency)}</span>
                </span>
                <span className="min-w-[4.15rem] rounded-[0.9rem] bg-[#f2f2f1] px-2 py-2 text-center text-[#111418] shadow-[inset_0_1px_0_rgb(255_255_255_/_0.85)] sm:min-w-[4.6rem]">
                  <span className="block text-[1.14rem] font-extrabold leading-none tracking-[-0.04em] sm:text-[1.38rem]">{formatOfferAmount(dailyAmount, offer.currency)}</span>
                  <span className="mt-1 block text-[0.56rem] font-extrabold leading-none text-muted-brand">{copy.paywall.perDay}</span>
                </span>
              </span>
            </button>
          );
        })}
      </div>
      <p className="mt-5 text-[0.94rem] leading-relaxed text-slate-brand">{copy.paywall.planRecommendation}</p>
      <p className="mt-1.5 text-sm font-medium text-muted-brand">{copy.paywall.planResearchNote}</p>
      <button type="button" disabled={busy} onClick={beginCheckout} className="mt-5 min-h-14 w-full rounded-2xl bg-forest px-5 text-base font-extrabold text-white shadow-[0_14px_28px_rgb(23_69_58_/_0.22)] transition hover:bg-emerald-deep focus:outline-none focus-visible:ring-4 focus-visible:ring-teal-brand/25 active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-50">{busy ? copy.paywall.loading : copy.paywall.cta()}</button>
      <p className="mt-4 text-center text-sm leading-relaxed text-muted-brand">{copy.paywall.exactPriceSummary(standardAmount, todayAmount, renewalAmount)}</p>
    </section>
  );

  return (
    <ConversionShell
      hideLogo
      stickyHeader={(
        <div className="fixed left-1/2 top-0 z-50 w-full max-w-lg -translate-x-1/2 border-b border-white/55 bg-white/70 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] shadow-[0_12px_34px_rgb(16_39_32_/_0.12)] backdrop-blur-xl supports-[backdrop-filter]:bg-white/60">
          <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3">
            <Link href="/" aria-label="Nutree" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/70 bg-white/75 shadow-[inset_0_0_0_1px_rgb(255_255_255_/_0.5),0_2px_8px_rgb(16_39_32_/_0.06)] backdrop-blur">
              <Image src="/nutree-logo-simple.png" alt="" width={72} height={64} priority className="h-7 w-7 object-contain" />
            </Link>
            <div className="min-w-0">
              <p className="text-[0.74rem] font-bold leading-tight text-muted-brand"><span className="text-[0.92rem] font-extrabold text-teal-brand">50%</span> {copy.paywall.offerReserved}</p>
              <strong className="mt-0.5 block text-[1.2rem] font-extrabold leading-none tracking-[-0.035em] text-[#111418] tabular-nums">{countdown}</strong>
            </div>
            <button
              type="button"
              disabled={busy}
              onClick={beginCheckout}
              className="min-h-10 rounded-[1rem] bg-forest px-3.5 text-[0.78rem] font-extrabold text-white shadow-[0_10px_24px_rgb(23_69_58_/_0.20)] transition hover:bg-emerald-deep focus:outline-none focus-visible:ring-4 focus-visible:ring-teal-brand/25 active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-50 sm:px-4 sm:text-[0.86rem]"
            >
              {busy ? copy.paywall.loading : copy.paywall.topCta}
            </button>
          </div>
        </div>
      )}
      className="gap-5"
    >
      <div className="pt-[5.75rem]">
          <section className="rounded-[2rem] bg-white p-5 shadow-[0_18px_46px_rgb(23_69_58_/_0.08)] sm:p-8">
            <p className="text-center text-[0.92rem] font-semibold text-slate-brand">{copy.paywall.goalIntro}</p>
            <h1 className="mx-auto mt-1 max-w-2xl text-center text-[1.28rem] font-extrabold leading-tight tracking-[-0.03em] text-forest sm:text-[1.55rem]">{copy.paywall.goalHeadline(targetWeight, targetDate)}</h1>
            <svg viewBox="0 0 640 245" className="mt-8 h-auto w-full" role="img" aria-label={copy.paywall.goalChartAria}>
              {[48, 181, 314, 447, 580].map((x) => <line key={x} x1={x} y1="20" x2={x} y2="190" stroke="#dce7e2" strokeWidth="2" />)}
              <path d="M48 62 C132 65 156 86 213 130 S304 165 360 168" fill="none" stroke="#a3bd68" strokeWidth="6" strokeLinecap="round" />
              <path d="M360 168 H580" fill="none" stroke="#2d8b70" strokeWidth="6" strokeLinecap="round" />
              <circle cx="48" cy="62" r="9" fill="#d7a84d" /><circle cx="360" cy="168" r="12" fill="#2d8b70" stroke="white" strokeWidth="6" />
              <rect x="304" y="77" width="112" height="67" rx="17" fill="#17453a" /><path d="M348 143 L360 155 L372 143" fill="#17453a" />
              <text x="360" y="103" textAnchor="middle" fill="white" fontSize="16" fontWeight="700">{copy.paywall.goalMarker}</text><text x="360" y="127" textAnchor="middle" fill="white" fontSize="22" fontWeight="800">{targetWeight} kg</text>
              <text x="62" y="52" fill="#6b7b75" fontSize="20" fontWeight="600">{currentWeight} kg</text><text x="48" y="228" fill="#6b7b75" fontSize="17" fontWeight="700">{copy.paywall.now}</text><text x="580" y="228" textAnchor="end" fill="#6b7b75" fontSize="17" fontWeight="700">{targetDate}</text>
            </svg>
            <p className="mx-auto mt-4 max-w-[35rem] text-center text-[0.9rem] leading-relaxed text-muted-brand">{copy.paywall.goalNote}</p>
          </section>

          {renderPlanSection('plans', copy.paywall.planTitle)}

          <section className="mt-5 rounded-[2rem] bg-white p-5 shadow-[0_18px_46px_rgb(23_69_58_/_0.08)] sm:mt-6 sm:p-8">
            <h2 className="text-[1.2rem] font-extrabold tracking-[-0.03em] text-forest">{copy.paywall.includesTitle}</h2>
            <div className="mt-5 grid gap-4">
              {benefits.map((benefit) => <div key={benefit.title} className="grid grid-cols-[2.55rem_1fr] gap-3"><span className="grid h-10 w-10 place-items-center rounded-2xl bg-mist text-[1.1rem]" aria-hidden="true">{benefit.icon}</span><div><h3 className="text-[0.92rem] font-extrabold text-forest">{benefit.title}</h3><p className="mt-0.5 text-[0.84rem] leading-relaxed text-muted-brand">{benefit.body}</p></div></div>)}
            </div>
          </section>

          <section className="mt-5 rounded-[2rem] bg-white p-5 shadow-[0_18px_46px_rgb(23_69_58_/_0.08)] sm:mt-6 sm:p-8">
            <h2 className="text-[1.2rem] font-extrabold tracking-[-0.03em] text-forest">{copy.paywall.personalTitle}</h2>
            <div className="mt-5 grid gap-4">
              {personalRows.map((row) => <div key={row.label} className="grid grid-cols-[2.55rem_1fr] items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-2xl bg-[#edf7f3] text-[1.1rem]" aria-hidden="true">{row.icon}</span><p className="text-[0.86rem] leading-relaxed text-muted-brand">{row.label} <strong className="font-extrabold text-forest">{row.value}</strong></p></div>)}
            </div>
          </section>

          <section className="mt-5 rounded-[2rem] bg-white p-5 text-center shadow-[0_18px_46px_rgb(23_69_58_/_0.08)] sm:mt-6 sm:p-8">
            <h2 className="text-[1.16rem] font-extrabold leading-tight tracking-[-0.025em] text-[#ef4d59]">{copy.paywall.appStoreTitle}</h2>
            <div className="mt-4 rounded-[1.65rem] bg-[#f6f6f6] px-4 py-4">
              <div className="flex items-center justify-center gap-3">
                <span className="text-[1.7rem]" aria-hidden="true"></span>
                <span className="text-[1.1rem] tracking-[0.08em] text-[#f5a11a]" aria-label="5 stars">★★★★★</span>
              </div>
              <p className="mt-2 text-[1.25rem] font-extrabold leading-none tracking-[-0.03em] text-[#111418]">{copy.paywall.appStoreRating}</p>
              <p className="mt-2 text-[0.88rem] font-semibold leading-relaxed text-muted-brand">{copy.paywall.appStoreReviews}</p>
            </div>
          </section>

          {renderPlanSection('plans-repeat', copy.paywall.repeatPlanTitle)}

          <section className="mt-5 rounded-[2rem] bg-white p-5 text-center shadow-[0_18px_46px_rgb(23_69_58_/_0.08)] sm:mt-6 sm:p-8">
            <Image src="/guarantee-30day.webp" alt="" width={160} height={160} className="mx-auto h-28 w-28 object-contain" />
            <h2 className="mt-3 text-[1.16rem] font-extrabold leading-tight tracking-[-0.025em] text-[#111418]">{copy.paywall.guaranteeTitle}</h2>
            <p className="mt-3 text-[0.84rem] font-medium leading-relaxed text-muted-brand">{copy.paywall.guaranteeBody}</p>
          </section>

          {context.provider === 'PAYPAL' && <p className="mt-5 rounded-2xl bg-white px-4 py-3 text-center text-sm font-semibold leading-relaxed text-muted-brand">{copy.paywall.paypalSummary(todayAmount, selected.renewal_description)}</p>}
          {error && <p role="alert" className="mt-5 rounded-2xl bg-white px-4 py-3 text-sm font-bold text-error-brand">{error}</p>}
          <p className="mx-auto mt-6 max-w-[38rem] px-4 text-center text-xs font-medium leading-relaxed text-muted-brand">{copy.paywall.termsIntro} {copy.paywall.secure}</p>
        </div>
        {typeof document !== 'undefined' && createPortal(<>
        {showLastOffer && (
          <div className="fixed inset-0 z-[998] flex items-center justify-center overflow-y-auto bg-white px-4 py-8" role="dialog" aria-modal="true" aria-label={localCheckoutCopy.lastOfferTitle}>
            <div className="w-full max-w-[30rem] text-center">
              <h2 className="mx-auto max-w-[25rem] text-[1.48rem] font-extrabold leading-tight tracking-[-0.04em] text-[#111418] sm:text-[1.72rem]">{localCheckoutCopy.lastOfferTitle} <span aria-hidden="true">🎁</span></h2>
              <p className="mt-3 text-[0.92rem] font-semibold leading-snug text-[#8d8f96]">{lastOfferRevealed ? localCheckoutCopy.lastOfferUnlocked : localCheckoutCopy.lastOfferSubtitle}</p>
              <div className="relative mx-auto mt-8 max-w-[27rem]">
                <div className="absolute -inset-x-8 -inset-y-7 rounded-[2rem] bg-[#dfe8ff] opacity-75 blur-3xl" aria-hidden="true" />
                <div
                  ref={lastOfferTicketRef}
                  className="relative aspect-[2.18/1] overflow-hidden rounded-[1.6rem] bg-[linear-gradient(135deg,#696ff4_0%,#9c63ee_48%,#5fbbe4_100%)] px-6 py-7 text-white shadow-[0_30px_82px_rgb(111_113_244_/_0.25),0_0_0_24px_rgb(236_241_255_/_0.72)] transition duration-300 focus:outline-none focus-visible:ring-4 focus-visible:ring-teal-brand/25 active:scale-[0.99] sm:rounded-[1.8rem]"
                  role="img"
                  aria-label={lastOfferRevealed ? localCheckoutCopy.lastOfferUnlocked : localCheckoutCopy.lastOfferScratchHint}
                  onPointerDown={(event) => {
                    event.currentTarget.setPointerCapture(event.pointerId);
                    trackEvent('local_last_offer_scratch_started', { offer_id: selected.id });
                    updateLastOfferScratch(event.clientX);
                  }}
                  onPointerMove={(event) => {
                    if (event.buttons !== 1 && event.pointerType !== 'touch') return;
                    updateLastOfferScratch(event.clientX);
                  }}
                  onClick={() => {
                    if (!lastOfferRevealed) finishLastOfferReveal();
                  }}
                >
                  <span className="absolute left-0 top-1/2 h-14 w-7 -translate-x-1/2 -translate-y-1/2 rounded-r-full bg-white" aria-hidden="true" />
                  <span className="absolute right-0 top-1/2 h-14 w-7 -translate-y-1/2 translate-x-1/2 rounded-l-full bg-white" aria-hidden="true" />
                  <span className="absolute inset-0 bg-[radial-gradient(circle_at_35%_35%,rgb(255_255_255_/_0.14),transparent_28%),radial-gradient(circle_at_82%_76%,rgb(255_255_255_/_0.12),transparent_32%)]" aria-hidden="true" />
                  <div className="relative grid h-full place-items-center">
                    <div>
                      <p className="text-[0.64rem] font-extrabold uppercase tracking-[0.34em] text-white/90">✨ {localCheckoutCopy.lastOfferEyebrow} ✨</p>
                      <p className="mt-3 text-[3.1rem] font-extrabold leading-[0.9] tracking-[-0.055em] text-white/95 sm:text-[3.8rem]">75% OFF</p>
                      <p className="mt-3 text-[0.86rem] font-extrabold leading-tight text-white/92">{localCheckoutCopy.lastOfferUnlocked}</p>
                    </div>
                  </div>
                  <div
                    className="absolute inset-0 touch-none rounded-[1.6rem] bg-[linear-gradient(112deg,#d6dbe5_0%,#ffffff_26%,#c8d0dc_50%,#f7f9fc_74%,#b9c4d2_100%)] transition-[clip-path,opacity] duration-300 motion-reduce:transition-none sm:rounded-[1.8rem]"
                    style={{
                      clipPath: `inset(0 0 0 ${lastOfferRevealed ? 100 : lastOfferScratchProgress}%)`,
                      opacity: lastOfferRevealed ? 0 : 1,
                    }}
                  >
                    <span className="absolute inset-0 bg-[repeating-linear-gradient(135deg,rgb(255_255_255_/_0.55)_0_3px,transparent_3px_15px),radial-gradient(circle_at_20%_30%,rgb(255_255_255_/_0.42),transparent_24%),radial-gradient(circle_at_78%_72%,rgb(23_37_32_/_0.08),transparent_28%)]" />
                    <span className="absolute inset-0 opacity-45 [background-image:radial-gradient(circle,rgb(23_37_32_/_0.18)_0_1px,transparent_1px)] [background-size:18px_18px]" />
                    <span className="absolute left-1/2 top-1/2 w-full -translate-x-1/2 -translate-y-1/2 px-8 text-center text-[0.92rem] font-black text-[#53625d]/70">
                      {localCheckoutCopy.lastOfferScratchHint}
                    </span>
                  </div>
                  {!lastOfferRevealed && lastOfferScratchProgress > 0 && (
                    <span
                      aria-hidden="true"
                      className="absolute bottom-0 top-0 w-8 -translate-x-1/2 bg-[linear-gradient(90deg,transparent,rgb(255_255_255_/_0.8),transparent)] blur-[1px]"
                      style={{ left: `${lastOfferScratchProgress}%` }}
                    />
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!lastOfferRevealed) {
                    finishLastOfferReveal();
                    return;
                  }
                  setShowLastOffer(false);
                  setLocalCheckoutDismissed(false);
                  beginCheckout();
                }}
                className="mt-9 min-h-[3.25rem] w-full max-w-[27rem] rounded-2xl bg-forest px-5 py-3.5 text-[0.92rem] font-extrabold text-white shadow-[0_14px_28px_rgb(23_69_58_/_0.22)] transition hover:bg-emerald-deep focus:outline-none focus-visible:ring-4 focus-visible:ring-teal-brand/25 active:scale-[0.985]"
              >
                {lastOfferRevealed ? localCheckoutCopy.lastOfferCta : localCheckoutCopy.lastOfferScratchHint}
              </button>
            </div>
          </div>
        )}
        {showLocalCheckout && (
          <div className="fixed inset-0 z-[999] grid place-items-center overflow-y-auto bg-[#111816]/52 px-4 py-5 backdrop-blur-[3px]" role="dialog" aria-modal="true" aria-label={copy.checkout.title}>
            <div className="relative z-[1000] w-full max-w-[28.5rem] max-h-[calc(100dvh-2.5rem)] overflow-y-auto rounded-[1.7rem] bg-[#f8f9fa] px-5 pb-5 pt-4 text-[#292e46] shadow-[0_28px_80px_rgb(10_18_16_/_0.34)] sm:px-6 sm:pb-6">
              <div className="grid grid-cols-[2.75rem_1fr_2.75rem] items-center">
                <button
                  type="button"
                  onClick={closeLocalCheckout}
                  aria-label={copy.checkout.close}
                  className="grid h-11 w-11 place-items-center rounded-full text-[2rem] font-light leading-none text-[#292e46] transition hover:bg-[#edf1ef]"
                >
                  ×
                </button>
                <h2 className="text-center text-[1.22rem] font-extrabold tracking-[-0.025em] text-[#292e46]">{copy.checkout.title}</h2>
                <span aria-hidden="true" />
              </div>

              <div className="mt-5 grid gap-2.5 text-[0.92rem] leading-tight">
                <div className="flex items-start justify-between gap-4">
                  <span>{localCheckoutCopy.planSubscription}</span>
                  <span className="shrink-0">{standardAmount}</span>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <span>{localCheckoutCopy.discountLabel}</span>
                  <span className="shrink-0 font-extrabold text-[#ef4d59]">-{discountAmount}</span>
                </div>
              </div>

              <div className="mt-5 border-y border-[#dde1e6] py-4">
                <div className="flex items-baseline justify-between gap-4 text-[0.92rem]">
                  <strong className="font-extrabold">{copy.checkout.total}:</strong>
                  <span><strong className="font-extrabold">{todayAmount}</strong> <span>{localCheckoutCopy.period}</span></span>
                </div>
              </div>

              <p className="mt-3 text-[0.82rem] font-medium leading-snug text-[#8c93a4]">{localCheckoutCopy.paymentReuse}</p>
              <h3 className="mt-5 text-center text-[0.98rem] font-extrabold tracking-[-0.015em] text-[#292e46]">{localCheckoutCopy.methodTitle}</h3>

              <div className="mt-5 overflow-hidden rounded-[1.25rem] border border-[#d9dde6] bg-white">
                <div className="p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="grid h-6 w-6 place-items-center rounded-full border-2 border-[#ef4d59]" aria-hidden="true"><span className="h-3.5 w-3.5 rounded-full bg-[#ef4d59]" /></span>
                      <strong className="text-[0.92rem] font-extrabold text-[#292e46]">{localCheckoutCopy.oneClick}</strong>
                    </div>
                    <strong className="text-[0.92rem] font-extrabold text-[#292e46]">{checkoutProvider}</strong>
                  </div>
                  <p className="mt-6 text-center text-[0.84rem] font-extrabold text-[#292e46]">{localCheckoutCopy.safer}</p>
                  <button
                    type="button"
                    onClick={() => {
                      useQuizStore.getState().setPurchased(true);
                      trackEvent('local_checkout_completed', { offer_id: selected.id, method: 'express' });
                      router.push('/success');
                    }}
                    className="mt-5 min-h-12 w-full rounded-xl bg-[#08d46d] px-4 text-[1.05rem] font-semibold text-[#061510] transition hover:brightness-95 active:scale-[0.99]"
                  >
                    {localCheckoutCopy.quickPay}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      useQuizStore.getState().setPurchased(true);
                      trackEvent('local_checkout_completed', { offer_id: selected.id, method: selected.provider.toLowerCase() });
                      router.push('/success');
                    }}
                    className={cn('mt-3 min-h-12 w-full rounded-xl px-4 text-[1.08rem] font-extrabold transition hover:brightness-95 active:scale-[0.99]', selected.provider === 'PAYPAL' ? 'bg-[#ffc439] italic text-[#06459b]' : 'bg-[#a50064] text-white')}
                  >
                    {selected.provider === 'PAYPAL' ? <><span className="not-italic">P</span> PayPal</> : localCheckoutCopy.providerButton}
                  </button>
                </div>
                <div className="flex items-center justify-between gap-3 border-t border-[#d9dde6] px-4 py-4">
                  <div className="flex items-center gap-3">
                    <span className="h-6 w-6 rounded-full border-2 border-[#c8ced8]" aria-hidden="true" />
                    <strong className="text-[1rem] font-extrabold text-[#292e46]">{localCheckoutCopy.card}</strong>
                  </div>
                  <div className="flex items-center gap-1.5 text-[0.64rem] font-extrabold">
                    <span className="text-[1.05rem] italic text-[#1a5dbb]">VISA</span>
                    <span className="rounded border border-[#dde1e6] px-1.5 py-1 text-[#e55121]">●●</span>
                    <span className="rounded bg-[#2f75bb] px-1.5 py-1 text-white">AMEX</span>
                  </div>
                </div>
              </div>

              <p className="mt-4 text-center text-[0.86rem] font-medium leading-snug text-[#8c93a4]">{localCheckoutCopy.encryption}</p>
              <div className="mt-5 flex items-center justify-center gap-3">
                <strong className="text-[1rem] font-extrabold text-[#292e46]">{localCheckoutCopy.guarantee}</strong>
                <Image src="/guarantee-30day.webp" alt="" width={40} height={40} className="h-8 w-8 object-contain" />
              </div>
            </div>
          </div>
        )}
        </>, document.body)}
    </ConversionShell>
  );
}
