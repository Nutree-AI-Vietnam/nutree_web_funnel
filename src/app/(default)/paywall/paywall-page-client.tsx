'use client';

import { ErrorCode, Purchases, type Product, type Purchases as PurchasesInstance } from '@revenuecat/purchases-js';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { BoCongThuongBadge } from '@/components/bo-cong-thuong-badge';
import { ConversionShell } from '@/components/conversion-shell';
import { NutreeLogo } from '@/components/nutree-logo';
import { PaywallExitVoucher } from '@/components/paywall-exit-voucher';
import { stripNonAttributionParams } from '@/lib/analytics/attribution';
import { identifyMetaUser } from '@/lib/analytics/meta-identity';
import { identifyFunnelLead } from '@/lib/analytics/posthog';
import { trackEvent, trackStepViewed } from '@/lib/analytics/track';
import { useCopy } from '@/lib/copy/use-copy';
import { getLocalPreviewCountry, isLocalPreviewHost, localPreviewData, localPreviewLead, localPreviewTdee } from '@/lib/local-preview';
import { normalizeCountryCode } from '@/lib/market/country';
import { clearPaywallCheckoutPending, configureRevenueCatForAnonymousCheckout, dismissCheckoutOverlay, EXIT_DISCOUNT_PERCENT, hasExitOfferBeenClaimed, hasPaywallCheckoutPending, markExitOfferClaimed, markPaywallCheckoutPending, paddleCheckoutClosedWithoutPayment, paddleCheckoutCompleted, paddleCheckoutIsOpen, PAYWALL_EXIT_OFFER_SECONDS, PAYWALL_OFFER_STATE_STORAGE_KEY, PAYWALL_WELCOME_OFFER_SECONDS, readRevenueCatWebConfig, readSelectedPaywallPlan, saveSelectedPaywallPlan, WELCOME_DISCOUNT_PERCENT } from '@/lib/revenuecat/web';
import { firstPaymentCommerce, formatPerDay, planPerDay, savingsVersusPriciest } from '@/lib/revenuecat/plan-pricing';
import { correlateRevenueCatCustomer } from '@/lib/api/client';
import { syncRevenueCatAttribution } from '@/lib/revenuecat/attribution-attributes';
import { completePurchasedCheckout } from '@/lib/revenuecat/purchase-handoff';
import { clearPendingRedemptionCorrelation, readPendingRedemptionCorrelation, redemptionHandoff, type RedemptionHandoff } from '@/lib/revenuecat/redemption-handoff';
import { usePostcheckoutRedirect } from '@/lib/revenuecat/use-postcheckout-redirect';
import { resolvePaywallPricing } from '@/lib/revenuecat/paywall-offer-state';
import { buildRevenueCatPaywall, checkoutPackage, defaultPaywallPlan, SIX_MONTH_PLAN_ID, type PaywallOfferKind, type RevenueCatPaywall } from '@/lib/revenuecat/paywall-plans';
import { hasWelcomeVoucherBeenClaimed, markWelcomeVoucherClaimed, shouldArmExitVoucher } from '@/lib/revenuecat/welcome-voucher';
import { clearCheckoutEmail, readCheckoutEmail } from '@/lib/revenuecat/checkout-email';
import { isUserPurchased, useHydrated, useQuizStore } from '@/lib/quiz/store';
import { formatWeight } from '@/lib/quiz/units';
import { FirstChangesCard, PlanGoalCard, SampleDayCard } from '@/components/plan/plan-overview';
import { AppStoreRating } from '@/components/value-tour/value-tour-demos';
import { periodWeeks, planForTimeline } from '@/lib/quiz/plan-content';
import { formatGoalDate, goalTimeline } from '@/lib/quiz/progress-projection';
import { localPreviewOffering } from '@/lib/revenuecat/local-preview-offering';
import { computeTdeeResult } from '@/lib/tdee/calculator';
import type { Period } from '@revenuecat/purchases-js';
import { useUnits } from '@/lib/quiz/use-units';
import { cn } from '@/lib/utils';

interface PaywallPageClientProps {
  initialCountryCode?: string;
  initialPlanId?: string;
  exitOfferMode: boolean;
  onMissingLead?: () => void;
  onCheckoutCancelled?: () => void;
}

type LoadState = 'loading' | 'ready' | 'error';
type PaywallPricingMode = 'original' | PaywallOfferKind;

interface StoredPaywallOffer {
  kind: PaywallOfferKind;
  expiresAt: number;
}

const OFFER_SECONDS = PAYWALL_WELCOME_OFFER_SECONDS;
const benefitEmoji = ['📋', '📸', '🍽️', '🔥', '💬'];

function formatCountdown(seconds: number) {
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}

function createPaywallOffer(kind: PaywallOfferKind, now = Date.now()): StoredPaywallOffer {
  return { kind, expiresAt: now + (kind === 'exit' ? PAYWALL_EXIT_OFFER_SECONDS : OFFER_SECONDS) * 1000 };
}

function readStoredPaywallOffer(): StoredPaywallOffer | null {
  if (typeof window === 'undefined') return null;
  try {
    const value = JSON.parse(window.sessionStorage.getItem(PAYWALL_OFFER_STATE_STORAGE_KEY) ?? 'null') as Partial<StoredPaywallOffer> | null;
    if ((value?.kind === 'welcome' || value?.kind === 'exit') && Number.isFinite(value.expiresAt)) return value as StoredPaywallOffer;
  } catch {
    // Ignore unavailable or malformed session storage and create a fresh offer.
  }
  return null;
}

function storePaywallOffer(offer: StoredPaywallOffer) {
  try {
    window.sessionStorage.setItem(PAYWALL_OFFER_STATE_STORAGE_KEY, JSON.stringify(offer));
  } catch {
    // The in-memory timer still keeps the current page consistent.
  }
}

function firstPaymentPrice(product: Product | null | undefined) {
  return product?.introPricePhase?.price ?? product?.price ?? null;
}

function goalDate(locale: 'vi' | 'en') {
  const date = new Date();
  date.setDate(date.getDate() + 182);
  return new Intl.DateTimeFormat(locale === 'vi' ? 'vi-VN' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
}

/** The date a plan bought today first renews. */
function renewalDate(period: Period | null | undefined, from = new Date()): Date | null {
  if (!period || !(period.number > 0)) return null;
  const date = new Date(from);
  if (period.unit === 'day') date.setDate(date.getDate() + period.number);
  else if (period.unit === 'week') date.setDate(date.getDate() + period.number * 7);
  else if (period.unit === 'month') date.setMonth(date.getMonth() + period.number);
  else date.setFullYear(date.getFullYear() + period.number);
  return date;
}

function purchaseErrorCode(error: unknown): number | null {
  if (typeof error !== 'object' || error === null || !('errorCode' in error)) return null;
  const code = (error as { errorCode?: unknown }).errorCode;
  return typeof code === 'number' ? code : null;
}

function isUserCancelledPurchase(error: unknown): boolean {
  return purchaseErrorCode(error) === ErrorCode.UserCancelledError;
}

function isAlreadyPurchased(error: unknown): boolean {
  return purchaseErrorCode(error) === ErrorCode.ProductAlreadyPurchasedError;
}

export function PaywallPageClient({ initialCountryCode, initialPlanId, exitOfferMode, onMissingLead }: PaywallPageClientProps) {
  const router = useRouter();
  const copy = useCopy();
  const { system } = useUnits();
  const hydrated = useHydrated();
  const lead = useQuizStore((state) => state.lead);
  const data = useQuizStore((state) => state.data);
  const activeLocale = useQuizStore((state) => state.locale);
  const tdee = useQuizStore((state) => state.tdee);
  const purchased = useQuizStore((state) => state.purchased);
  const setPurchased = useQuizStore((state) => state.setPurchased);
  const setData = useQuizStore((state) => state.setData);
  const setLead = useQuizStore((state) => state.setLead);
  const setLocale = useQuizStore((state) => state.setLocale);
  const setTdee = useQuizStore((state) => state.setTdee);
  const [selectedId, setSelectedId] = useState<string | null>(() => initialPlanId ?? readSelectedPaywallPlan());
  const [offerStateReady, setOfferStateReady] = useState(false);
  const [offerKind, setOfferKind] = useState<PaywallPricingMode>(exitOfferMode ? 'exit' : 'original');
  const [offerExpiresAt, setOfferExpiresAt] = useState<number | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [paywall, setPaywall] = useState<RevenueCatPaywall>({ plans: [], recommendationNote: null });
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCheckoutConfirm, setShowCheckoutConfirm] = useState(false);
  const [redemption, setRedemption] = useState<RedemptionHandoff | null>(null);
  const purchasesRef = useRef<PurchasesInstance | null>(null);
  const anonymousAppUserIdRef = useRef<string | null>(null);
  const checkoutRef = useRef<{ leadId: string; purchases: PurchasesInstance; appUserId: string | null } | null>(null);
  const checkoutInFlightRef = useRef(false);
  const paddleOpenedRef = useRef(false);
  const purchaseSucceededRef = useRef(false);
  const purchaseLeadIdRef = useRef<string | null>(null);
  const redemptionLinkHashRef = useRef<string | null>(null);
  const plans = paywall.plans;

  const countryCode = initialCountryCode ?? (isLocalPreviewHost() ? getLocalPreviewCountry() : undefined);
  const resolvedCountryCode = normalizeCountryCode(countryCode) ?? 'VN';
  // English shows the price people pay as the price: no countdown, crossed-out price or "% off"
  // while the plans renew at the discounted price. Only the exit offer, which really ends, keeps a timer.
  const plainPricing = activeLocale === 'en';
  const timeline = useMemo(() => goalTimeline(data), [data]);
  const timelinePlan = useMemo(
    () => planForTimeline(plans, (plan) => periodWeeks(plan.rcPackage.webBillingProduct.period), timeline?.weeks ?? null),
    [plans, timeline],
  );
  const selected = useMemo(
    () => plans.find((plan) => plan.id === selectedId) ?? (plainPricing ? timelinePlan : undefined) ?? defaultPaywallPlan(plans),
    [plainPricing, plans, selectedId, timelinePlan],
  );

  usePostcheckoutRedirect(hydrated && isUserPurchased({ purchased, lead }));

  useEffect(() => trackStepViewed('paywall'), []);

  // The support chat may show on the paywall, but not over Paddle's checkout.
  useEffect(() => {
    const root = document.documentElement;
    if (busy || showCheckoutConfirm) delete root.dataset.supportChat;
    else root.dataset.supportChat = 'on';
    return () => {
      delete root.dataset.supportChat;
    };
  }, [busy, showCheckoutConfirm]);

  useEffect(() => {
    if (!hydrated || !lead?.lead_id) return;
    identifyFunnelLead(lead.lead_id, readCheckoutEmail());
  }, [hydrated, lead]);

  useEffect(() => {
    if (exitOfferMode) stripNonAttributionParams();
  }, [exitOfferMode]);

  useEffect(() => {
    if (!hydrated) return;
    const now = Date.now();
    const unfinishedCheckout = hasPaywallCheckoutPending();
    if (unfinishedCheckout) clearPaywallCheckoutPending();
    const current = useQuizStore.getState();
    const resumeUnfinishedPaddle = unfinishedCheckout && !isUserPurchased({ purchased: current.purchased, lead: current.lead });
    const pricing = resolvePaywallPricing({
      now,
      exitOfferMode,
      unfinishedCheckout: resumeUnfinishedPaddle,
      exitClaimed: hasExitOfferBeenClaimed(),
      welcomeClaimed: hasWelcomeVoucherBeenClaimed(),
      stored: readStoredPaywallOffer(),
      welcomeSeconds: OFFER_SECONDS,
      exitSeconds: PAYWALL_EXIT_OFFER_SECONDS,
    });
    if (resumeUnfinishedPaddle) {
      saveSelectedPaywallPlan(SIX_MONTH_PLAN_ID);
      setSelectedId(SIX_MONTH_PLAN_ID);
      markExitOfferClaimed();
    }
    if (pricing.mode !== 'original') storePaywallOffer({ kind: pricing.mode, expiresAt: pricing.expiresAt });
    if (pricing.mode === 'welcome' && pricing.autoApplied) trackEvent('welcome_offer_auto_applied', { discount_percent: WELCOME_DISCOUNT_PERCENT, offer_auto_applied: true });
    const readyTimer = window.setTimeout(() => {
      setOfferKind(pricing.mode);
      setOfferExpiresAt(pricing.mode === 'original' ? null : pricing.expiresAt);
      setSecondsLeft(pricing.mode === 'original' ? 0 : Math.max(0, Math.ceil((pricing.expiresAt - Date.now()) / 1000)));
      setOfferStateReady(true);
    }, 0);
    return () => window.clearTimeout(readyTimer);
  }, [exitOfferMode, hydrated]);

  useEffect(() => {
    if (offerExpiresAt === null) return;
    const updateCountdown = () => setSecondsLeft(Math.max(0, Math.ceil((offerExpiresAt - Date.now()) / 1000)));
    updateCountdown();
    const timer = window.setInterval(updateCountdown, 1000);
    return () => window.clearInterval(timer);
  }, [offerExpiresAt]);

  useEffect(() => {
    if (!hydrated || lead) return;
    if (!isLocalPreviewHost()) {
      onMissingLead?.();
      return;
    }
    setData(localPreviewData);
    setLead(localPreviewLead);
    setLocale(resolvedCountryCode === 'VN' ? 'vi' : 'en');
    setTdee(localPreviewTdee, 'fallback');
  }, [resolvedCountryCode, hydrated, lead, onMissingLead, setData, setLead, setLocale, setTdee]);

  useEffect(() => {
    let cancelled = false;

    async function loadRevenueCatOffering() {
      if (isLocalPreviewHost() && !process.env.NEXT_PUBLIC_REVENUECAT_WEB_API_KEY) {
        // No RevenueCat key on this machine: lay the paywall out with stand-in prices. Checkout stays off.
        await Promise.resolve();
        if (!cancelled) {
          setPaywall(buildRevenueCatPaywall(localPreviewOffering(resolvedCountryCode)));
          setLoadState('ready');
        }
        return;
      }
      try {
        const config = readRevenueCatWebConfig(undefined, resolvedCountryCode);
        if (!lead) throw new Error('Your checkout draft is unavailable. Return to email capture to continue.');
        const pendingCorrelation = readPendingRedemptionCorrelation();
        const pendingAppUserId = pendingCorrelation?.leadId === lead.lead_id ? pendingCorrelation.appUserId : null;
        const checkout = checkoutRef.current?.leadId === lead.lead_id
          ? checkoutRef.current
          : {
              leadId: lead.lead_id,
              ...(pendingAppUserId
                ? { appUserId: pendingAppUserId, purchases: Purchases.configure({ apiKey: config.apiKey, appUserId: pendingAppUserId }) }
                : configureRevenueCatForAnonymousCheckout(config)),
            };
        checkoutRef.current = checkout;
        const purchases = checkout.purchases;
        anonymousAppUserIdRef.current = checkout.appUserId;
        purchasesRef.current = purchases;
        const offerings = await purchases.getOfferings({
          offeringIdentifier: config.offeringIdentifier,
          ...(resolvedCountryCode === 'VN' ? { currency: 'VND' } : { currency: 'USD' }),
        });
        const offering = offerings.all[config.offeringIdentifier];
        if (!offering) throw new Error('RevenueCat could not find the configured web offering.');
        const nextPaywall = buildRevenueCatPaywall(offering);
        if (!nextPaywall.plans.length) throw new Error('RevenueCat offering has no packages to show.');
        if (!cancelled) {
          setError(null);
          setPaywall(nextPaywall);
          setLoadState('ready');
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Unable to initialize RevenueCat checkout.');
          setLoadState('error');
        }
      }
    }

    void loadRevenueCatOffering();
    return () => { cancelled = true; };
  }, [resolvedCountryCode, lead]);

  const correlatePurchasedCustomer = useCallback(async () => {
    if (loadState !== 'ready' || !lead || !anonymousAppUserIdRef.current || !redemptionLinkHashRef.current) return;
    try {
      const acknowledgedLead = await correlateRevenueCatCustomer(lead.lead_id, anonymousAppUserIdRef.current, redemptionLinkHashRef.current);
      setLead(acknowledgedLead);
      clearPendingRedemptionCorrelation(lead.lead_id);
      clearCheckoutEmail();
      setRedemption(redemptionHandoff({ correlationAcknowledged: true, redemptionLinkHash: redemptionLinkHashRef.current }));
    } catch {
      // A completed provider payment must never reopen checkout while verification retries.
      setRedemption({ kind: 'pending' });
    }
  }, [lead, loadState, setLead]);

  useEffect(() => {
    if (!hydrated || !lead || redemptionLinkHashRef.current) return;
    const pendingCorrelation = readPendingRedemptionCorrelation();
    if (pendingCorrelation?.leadId !== lead.lead_id) return;
    purchaseLeadIdRef.current = lead.lead_id;
    redemptionLinkHashRef.current = pendingCorrelation.redemptionLinkHash;
  }, [hydrated, lead]);

  useEffect(() => {
    const hasPersistedCorrelation = Boolean(lead && readPendingRedemptionCorrelation()?.leadId === lead.lead_id);
    if (redemption?.kind !== 'pending' && !hasPersistedCorrelation) return;
    const retry = window.setTimeout(() => { void correlatePurchasedCustomer(); }, 15_000);
    return () => window.clearTimeout(retry);
  }, [correlatePurchasedCustomer, lead, redemption]);

  const openCheckout = useCallback(async (offer: PaywallOfferKind | null) => {
    const plan = selected;
    if (checkoutInFlightRef.current || purchaseLeadIdRef.current === lead?.lead_id) return;
    if (!purchasesRef.current || !lead || !plan || !anonymousAppUserIdRef.current) {
      setError('RevenueCat checkout is still loading. Please try again in a moment.');
      return;
    }
    const customerEmail = readCheckoutEmail();
    if (customerEmail) identifyMetaUser({ email: customerEmail, externalId: lead.lead_id, firstName: data.name });
    if (!customerEmail) {
      setError(activeLocale === 'vi' ? 'Vui lòng quay lại bước email để xác nhận địa chỉ thanh toán trước khi mua.' : 'Return to email capture to confirm your checkout email before purchasing.');
      return;
    }
    checkoutInFlightRef.current = true;
    paddleOpenedRef.current = false;
    purchaseSucceededRef.current = false;
    setBusy(true);
    setError(null);
    const isExitOffer = offer === 'exit';
    let watchPaddle = 0;
    let abandonTimer = 0;
    let stopWatchingPaddle = () => {};
    const applyUnfinishedPaddleDiscount = () => {
      stopWatchingPaddle();
      checkoutInFlightRef.current = false;
      setBusy(false);
      clearPaywallCheckoutPending();
      if (isExitOffer || isUserPurchased({ purchased, lead })) return;
      dismissCheckoutOverlay(document);
      saveSelectedPaywallPlan(SIX_MONTH_PLAN_ID);
      setSelectedId(SIX_MONTH_PLAN_ID);
      markExitOfferClaimed();
      const expiresAt = Date.now() + PAYWALL_WELCOME_OFFER_SECONDS * 1000;
      storePaywallOffer({ kind: 'exit', expiresAt });
      setOfferKind('exit');
      setOfferExpiresAt(expiresAt);
      setSecondsLeft(PAYWALL_WELCOME_OFFER_SECONDS);
      setShowCheckoutConfirm(false);
      setError(null);
      trackEvent('revenuecat_checkout_cancelled', { plan: plan.id, paddle_opened: true });
      trackEvent('exit_offer_claimed', { discount_percent: EXIT_DISCOUNT_PERCENT, plan: SIX_MONTH_PLAN_ID });
    };
    const rcPackage = checkoutPackage(plan, offer);
    const checkoutCommerce = firstPaymentCommerce(rcPackage.webBillingProduct);
    trackEvent('revenuecat_checkout_started', { plan: plan.id, package_id: rcPackage.identifier, offer_kind: offer ?? 'original', offer_auto_applied: offer === 'welcome' && !hasWelcomeVoucherBeenClaimed(), country_code: countryCode ?? 'auto', ...checkoutCommerce });
    void syncRevenueCatAttribution(purchasesRef.current);

    watchPaddle = window.setInterval(() => {
      if (purchaseSucceededRef.current) return;
      if (paddleCheckoutIsOpen(document)) {
        paddleOpenedRef.current = true;
        window.clearTimeout(abandonTimer);
        abandonTimer = 0;
        return;
      }
      if (!paddleOpenedRef.current || abandonTimer) return;
      abandonTimer = window.setTimeout(() => {
        if (!purchaseSucceededRef.current) applyUnfinishedPaddleDiscount();
      }, 1200);
    }, 200);
    const onPaddleMessage = (event: MessageEvent) => {
      if (paddleCheckoutCompleted(event.data)) {
        purchaseSucceededRef.current = true;
        window.clearTimeout(abandonTimer);
        return;
      }
      if (!paddleCheckoutClosedWithoutPayment(event.data)) return;
      paddleOpenedRef.current = true;
      window.clearTimeout(abandonTimer);
      applyUnfinishedPaddleDiscount();
    };
    window.addEventListener('message', onPaddleMessage);
    stopWatchingPaddle = () => {
      window.clearInterval(watchPaddle);
      window.clearTimeout(abandonTimer);
      window.removeEventListener('message', onPaddleMessage);
    };
    try {
      markPaywallCheckoutPending();
      const purchaseParameters = {
        rcPackage,
        customerEmail,
        selectedLocale: activeLocale,
        defaultLocale: 'en',
        skipSuccessPage: true,
      } as Parameters<PurchasesInstance['purchase']>[0];
      const purchaseResult = await purchasesRef.current.purchase(purchaseParameters);
      purchaseSucceededRef.current = true;
      window.clearTimeout(abandonTimer);
      clearPaywallCheckoutPending();
      await completePurchasedCheckout({
        markPurchased: () => {
          setPurchased(true);
          trackEvent('revenuecat_checkout_completed', { plan: plan.id, ...checkoutCommerce });
          purchaseLeadIdRef.current = lead.lead_id;
        },
        redeemUrl: purchaseResult.redemptionInfo?.redeemUrl,
        operationSessionId: purchaseResult.operationSessionId,
        apiKey: readRevenueCatWebConfig(undefined, resolvedCountryCode).apiKey,
        leadId: lead.lead_id,
        appUserId: anonymousAppUserIdRef.current ?? '',
        correlate: async (hash) => {
          redemptionLinkHashRef.current = hash;
          await correlatePurchasedCustomer();
        },
        onRecovery: () => setRedemption({ kind: 'recovery' }),
        onPending: (hash) => {
          redemptionLinkHashRef.current = hash;
          setRedemption({ kind: 'pending' });
        },
        navigate: () => router.push('/postcheckout'),
      });
    } catch (purchaseError) {
      const leftPaddleOpen = paddleOpenedRef.current || isUserCancelledPurchase(purchaseError);
      if (leftPaddleOpen && !isAlreadyPurchased(purchaseError)) {
        applyUnfinishedPaddleDiscount();
        return;
      }
      clearPaywallCheckoutPending();
      if (!isUserCancelledPurchase(purchaseError)) {
        setError(purchaseError instanceof Error ? purchaseError.message : 'RevenueCat could not complete checkout. Please try again.');
      }
    } finally {
      stopWatchingPaddle();
      checkoutInFlightRef.current = false;
      setBusy(false);
    }
  }, [activeLocale, countryCode, correlatePurchasedCustomer, data.name, lead, purchased, resolvedCountryCode, router, selected, setPurchased]);

  const requestCheckout = () => {
    if (lead && readPendingRedemptionCorrelation()?.leadId === lead.lead_id) {
      setRedemption({ kind: 'pending' });
      return;
    }
    if (!purchasesRef.current || !lead || !pricesReady) {
      setError('RevenueCat checkout is still loading. Please try again in a moment.');
      return;
    }
    setError(null);
    // English opens Paddle straight from the plan button; the renewal terms sit under that button.
    if (plainPricing) void openCheckout(activeOffer);
    else setShowCheckoutConfirm(true);
  };

  const targetWeight = Math.round(data.target_weight_kg ?? data.weight_kg ?? 60);
  const currentWeight = Math.round(data.weight_kg ?? targetWeight + 6);
  const targetDate = goalDate(activeLocale);
  const countdown = formatCountdown(secondsLeft);
  const goal = data.fitness_goal === 'bulk' ? copy.paywall.goalBulk : data.fitness_goal === 'maintain' ? copy.paywall.goalMaintain : data.fitness_goal === 'recomp' ? copy.paywall.goalRecomp : copy.paywall.goalCut;
  const gender = data.gender === 'male' ? copy.paywall.genderMale : data.gender === 'female' ? copy.paywall.genderFemale : copy.paywall.genderFallback;
  const benefits = copy.paywall.benefits.map((benefit, index) => ({ ...benefit, icon: benefitEmoji[index] ?? '✅' }));
  const persistedCorrelation = Boolean(lead && readPendingRedemptionCorrelation()?.leadId === lead.lead_id);
  const displayedRedemption = redemption ?? (persistedCorrelation ? ({ kind: 'pending' } satisfies RedemptionHandoff) : lead?.status === 'payment_verified' ? ({ kind: 'email_sent' } satisfies RedemptionHandoff) : null);
  const checkoutUnavailable = Boolean(displayedRedemption);
  const personalRows = [
    { icon: '🔥', label: copy.paywall.goalLabel, value: goal },
    { icon: '🎯', label: copy.paywall.personalizedFor, value: gender },
    { icon: '🥦', label: copy.paywall.calorieLabel, value: tdee ? `${Math.round(tdee.calories).toLocaleString(activeLocale === 'vi' ? 'vi-VN' : 'en-US')} kcal` : copy.paywall.calorieFallback },
    { icon: '🚶', label: copy.paywall.activityLabel, value: copy.paywall.activityValue(data.training_days_per_week ?? 0) },
  ];
  const selectedLabel = selected?.label[activeLocale] ?? '';
  const renewalCadence = selected?.billingLabel[activeLocale].toLowerCase() ?? '';
  const isOriginalPricing = offerKind === 'original';
  const isExitOfferMode = offerKind === 'exit';
  const exitOfferActive = isExitOfferMode && secondsLeft > 0;
  const welcomeOfferActive = offerKind === 'welcome' && (plainPricing || secondsLeft > 0);
  const activeOffer: PaywallOfferKind | null = exitOfferActive ? 'exit' : welcomeOfferActive ? 'welcome' : null;
  const selectedOriginalPrice = firstPaymentPrice(selected?.rcPackage.webBillingProduct);
  const selectedOfferProduct = selected ? checkoutPackage(selected, activeOffer).webBillingProduct : null;
  const selectedOfferPrice = firstPaymentPrice(selectedOfferProduct);
  const originalTotal = selectedOriginalPrice?.formattedPrice ?? '…';
  const introTotal = selectedOfferPrice?.formattedPrice ?? originalTotal;
  const renewalTotal = selectedOfferProduct?.price.formattedPrice ?? '…';
  const offerDiscountPercent = selectedOfferProduct !== selected?.rcPackage.webBillingProduct
    ? (activeOffer === 'exit' ? EXIT_DISCOUNT_PERCENT : WELCOME_DISCOUNT_PERCENT)
    : 0;
  const priceLocale = activeLocale === 'vi' ? 'vi-VN' : 'en-US';
  const perDayByPlan = Object.fromEntries(plans.map((plan) => [plan.id, planPerDay(checkoutPackage(plan, activeOffer).webBillingProduct)]));
  const savingsByPlan = savingsVersusPriciest(perDayByPlan);
  const pricesReady = loadState === 'ready';
  const offerNote = isOriginalPricing
    ? copy.paywall.standardPriceNote
    : exitOfferActive
    ? (activeLocale === 'vi' ? `Ưu đãi giảm ${EXIT_DISCOUNT_PERCENT}% đã được áp dụng cho tất cả gói.` : `Your ${EXIT_DISCOUNT_PERCENT}% offer applies to every plan.`)
    : isExitOfferMode
      ? (activeLocale === 'vi' ? `Ưu đãi giảm ${EXIT_DISCOUNT_PERCENT}% đã hết hạn. Giá đã trở về giá gốc cho tất cả gói.` : `The ${EXIT_DISCOUNT_PERCENT}% offer has expired. Prices have returned to the original amount for every plan.`)
      : welcomeOfferActive
        ? copy.paywall.planResearchNote
        : (activeLocale === 'vi' ? 'Ưu đãi đã hết hạn. Giá đã trở về giá gốc cho tất cả gói.' : 'The offer has expired. Prices have returned to the original amount for every plan.');
  const priceSummary = isOriginalPricing
    ? copy.paywall.standardPriceSummary(originalTotal, renewalTotal, selectedLabel, renewalCadence)
    : exitOfferActive
    ? (activeLocale === 'vi'
      ? `Ưu đãi giảm ${EXIT_DISCOUNT_PERCENT}% áp dụng cho mọi gói. Bạn thanh toán ${introTotal} hôm nay, sau đó gói tự gia hạn ${renewalTotal} ${renewalCadence} cho đến khi bạn hủy.`
      : `Your ${EXIT_DISCOUNT_PERCENT}% offer applies to every plan. You pay ${introTotal} today, then ${renewalTotal} ${renewalCadence} until you cancel.`)
    : isExitOfferMode
      ? (activeLocale === 'vi'
        ? `Ưu đãi đã hết hạn. Bạn thanh toán ${originalTotal} hôm nay, sau đó gói tự gia hạn theo giá đầy đủ ${renewalTotal} ${renewalCadence} cho đến khi bạn hủy.`
        : `The offer has expired. You pay ${originalTotal} today, then ${renewalTotal} ${renewalCadence} until you cancel.`)
      : welcomeOfferActive
        ? copy.paywall.exactPriceSummary(introTotal, renewalTotal, selectedLabel, renewalCadence)
        : (activeLocale === 'vi'
          ? `Ưu đãi đã hết hạn. Bạn thanh toán ${originalTotal} hôm nay, sau đó gói tự gia hạn theo giá đầy đủ ${renewalTotal} ${renewalCadence} cho đến khi bạn hủy.`
          : `The offer has expired. You pay ${originalTotal} today, then ${renewalTotal} ${renewalCadence} until you cancel.`);
  const headerOfferLabel = isOriginalPricing
    ? copy.paywall.standardHeader
    : exitOfferActive
    ? (activeLocale === 'vi' ? `Ưu đãi · Giảm ${EXIT_DISCOUNT_PERCENT}%` : `${EXIT_DISCOUNT_PERCENT}% off offer`)
    : isExitOfferMode
      ? (activeLocale === 'vi' ? `Ưu đãi giảm ${EXIT_DISCOUNT_PERCENT}% đã hết hạn` : `${EXIT_DISCOUNT_PERCENT}% offer expired`)
    : welcomeOfferActive
      ? `${copy.paywall.discountTag(WELCOME_DISCOUNT_PERCENT)} · Nutree Premium`
      : (activeLocale === 'vi' ? 'Ưu đãi đã hết hạn' : 'Offer expired');
  const timerLabel = isOriginalPricing
    ? copy.paywall.standardTimer
    : isExitOfferMode
    ? (secondsLeft > 0
      ? (activeLocale === 'vi' ? `Ưu đãi giảm ${EXIT_DISCOUNT_PERCENT}% kết thúc sau: ${countdown}` : `${EXIT_DISCOUNT_PERCENT}% offer ends in: ${countdown}`)
      : (activeLocale === 'vi' ? `Ưu đãi giảm ${EXIT_DISCOUNT_PERCENT}% đã hết hạn` : `${EXIT_DISCOUNT_PERCENT}% offer expired`))
    : secondsLeft > 0 ? copy.paywall.offerEnds(countdown) : (activeLocale === 'vi' ? 'Xem giá hiện tại của bạn' : 'See your current price');
  const confirmCopy = activeLocale === 'vi'
    ? { title: 'Xác nhận đăng ký', body: 'Thanh toán an toàn qua Paddle. Chúng tôi sẽ gửi hướng dẫn kích hoạt gói đến email của bạn.', continue: 'Tiếp tục thanh toán', dismiss: 'Quay lại' }
    : { title: 'Confirm your subscription', body: 'Checkout is securely processed by Paddle. We’ll email you instructions to activate your plan.', continue: 'Continue to payment', dismiss: 'Go back' };
  const confirmPriceCopy = activeLocale === 'vi'
    ? {
        first: offerDiscountPercent > 0 ? `Giá ưu đãi ${introTotal} (giảm ${offerDiscountPercent}%).` : `Thanh toán ${introTotal} hôm nay.`,
        renewal: `Sau đó, gói tự động gia hạn ${renewalTotal} ${renewalCadence}. Bạn có thể hủy bất cứ lúc nào.`,
      }
    : {
        first: offerDiscountPercent > 0 ? `Offer price ${introTotal} (${offerDiscountPercent}% off).` : `You pay ${introTotal} today.`,
        renewal: `After that, the plan renews at ${renewalTotal} ${renewalCadence}. Cancel anytime.`,
      };


  const funnelPaywall = copy.funnel.paywall;
  const periodWord = (period: Period) => funnelPaywall.planName[period.unit][period.number === 1 ? 0 : 1];
  const planName = (plan: (typeof plans)[number]) => {
    const period = plan.rcPackage.webBillingProduct.period;
    return period ? `${period.number} ${periodWord(period)}` : plan.label[activeLocale];
  };
  const billedLabel = (plan: (typeof plans)[number]) => {
    const period = plan.rcPackage.webBillingProduct.period;
    return period ? funnelPaywall.billed(period.number, periodWord(period)) : plan.billingLabel[activeLocale];
  };
  const selectedPeriod = selected?.rcPackage.webBillingProduct.period;
  const nextCharge = renewalDate(selectedPeriod);
  const renewalLine = funnelPaywall.renewal(
    introTotal,
    renewalTotal,
    selectedPeriod ? funnelPaywall.cadence(selectedPeriod.number, periodWord(selectedPeriod)) : renewalCadence,
    nextCharge ? formatGoalDate(nextCharge, activeLocale) : '',
  );
  const targetLabel = timeline ? formatWeight(timeline.targetKg, system) : null;
  const englishCta = targetLabel ? funnelPaywall.cta(targetLabel) : funnelPaywall.ctaFallback;
  const statusNodes = (
    <>
        {error && <p role="alert" className="mt-5 rounded-2xl bg-white px-4 py-3 text-sm font-bold text-error-brand">{error}</p>}
        {displayedRedemption?.kind === 'pending' && <p role="status" className="mt-5 rounded-2xl bg-white px-4 py-3 text-sm font-bold text-slate-brand">{activeLocale === 'vi' ? 'Đang xác minh thanh toán của bạn…' : 'Verifying your payment…'}</p>}
        {displayedRedemption?.kind === 'recovery' && <section className="mt-5 rounded-2xl bg-white px-5 py-5 text-center shadow-[0_18px_46px_rgb(23_69_58_/_0.08)]"><h2 className="text-lg font-extrabold text-forest">{activeLocale === 'vi' ? 'Thanh toán đã được ghi nhận' : 'Payment received'}</h2><p className="mt-2 text-sm leading-relaxed text-muted-brand">{activeLocale === 'vi' ? 'Chúng tôi không thể xác minh liên kết kích hoạt. Vui lòng kiểm tra email thanh toán của bạn hoặc liên hệ hỗ trợ.' : 'We could not verify your activation link. Check your purchase email or contact support.'}</p></section>}
        {displayedRedemption?.kind === 'email_sent' && <section className="mt-5 rounded-2xl bg-white px-5 py-5 text-center shadow-[0_18px_46px_rgb(23_69_58_/_0.08)]"><h2 className="text-lg font-extrabold text-forest">{activeLocale === 'vi' ? 'Kiểm tra email của bạn' : 'Check your email'}</h2><p className="mt-2 text-sm leading-relaxed text-muted-brand">{activeLocale === 'vi' ? 'RevenueCat đã gửi liên kết bảo mật đến email thanh toán. Mở liên kết đó trong Nutree để tự động kích hoạt gói.' : 'RevenueCat sent a secure link to your checkout email. Open it in Nutree to activate your plan automatically.'}</p></section>}
    </>
  );

  if (!hydrated || !lead || !offerStateReady) return null;

  const englishHeader = (
    <div className={cn('fixed left-1/2 top-0 z-50 w-full max-w-lg -translate-x-1/2 border-b px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] shadow-[0_12px_34px_rgb(16_39_32_/_0.12)] backdrop-blur-xl', exitOfferActive ? 'border-[#FDBA74] bg-[#FFF7ED]/95' : 'border-white/55 bg-white/80')}>
      <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3">
        <Link href={`/survey/${activeLocale}`} aria-label="Nutree" className="block h-11 w-11 shrink-0"><NutreeLogo priority className="h-11 w-11" /></Link>
        <div className="min-w-0">
          {exitOfferActive ? (
            <>
              <p className="text-[0.74rem] font-bold leading-tight text-[#9A3412]">{funnelPaywall.exitHeader}</p>
              <strong aria-live="polite" className="mt-0.5 inline-flex rounded-md bg-[#C2410C] px-1.5 py-0.5 text-[1.1rem] font-extrabold leading-none tabular-nums text-white">{countdown}</strong>
            </>
          ) : (
            <>
              <p className="truncate text-[0.74rem] font-bold leading-tight text-muted-brand">{data.name?.trim() ? copy.funnel.plan.eyebrow(data.name.trim()) : funnelPaywall.header}</p>
              <p className="mt-0.5 truncate text-[0.95rem] font-extrabold leading-tight text-forest">{selected && pricesReady ? `${planName(selected)} · ${introTotal}` : funnelPaywall.header}</p>
            </>
          )}
        </div>
        <button type="button" disabled={!pricesReady || busy || checkoutUnavailable} onClick={requestCheckout} className={cn('min-h-11 rounded-[1rem] px-3.5 text-[0.82rem] font-extrabold text-white shadow-[0_10px_24px_rgb(23_69_58_/_0.20)] transition focus:outline-none focus-visible:ring-4 focus-visible:ring-teal-brand/25 active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-50', exitOfferActive ? 'bg-[#C2410C] hover:bg-[#9A3412]' : 'bg-forest hover:bg-emerald-deep')}>{busy ? copy.paywall.loading : funnelPaywall.topCta}</button>
      </div>
    </div>
  );

  const checkoutButton = (
    <button type="button" disabled={!pricesReady || busy || checkoutUnavailable} onClick={requestCheckout} className={cn('min-h-14 w-full rounded-2xl px-5 text-base font-extrabold text-white shadow-[0_14px_28px_rgb(23_69_58_/_0.22)] transition focus:outline-none focus-visible:ring-4 focus-visible:ring-teal-brand/25 active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-50', exitOfferActive ? 'bg-[#C2410C] hover:bg-[#9A3412]' : 'bg-forest hover:bg-emerald-deep')}>{busy ? copy.paywall.loading : englishCta}</button>
  );

  const planTdee = tdee ?? computeTdeeResult(data);
  const englishBody = (
    <div className="grid gap-4 pt-[5.5rem]">
      <PlanGoalCard data={data} tdee={planTdee} system={system} />
      {planTdee && <SampleDayCard tdee={planTdee} diet={data.dietary_preferences} />}
      {planTdee && <FirstChangesCard data={data} tdee={planTdee} />}

      <section id="plans" className="rounded-[1.6rem] bg-white p-4 shadow-[0_18px_46px_rgb(23_69_58_/_0.08)] sm:p-5">
        <h2 className="text-[1.12rem] font-extrabold tracking-[-0.02em] text-forest">{funnelPaywall.choosePlan}</h2>
        {isExitOfferMode && <p className={cn('mt-3 rounded-[1.15rem] px-3 py-2.5 text-center text-[0.84rem] font-extrabold tabular-nums', exitOfferActive ? 'bg-[#FFF7ED] text-[#9A3412] ring-1 ring-[#FDBA74]' : 'bg-mist text-forest')}>{exitOfferActive ? funnelPaywall.exitTimer(countdown) : funnelPaywall.exitEnded}</p>}
        <div role="radiogroup" aria-label={copy.paywall.selectPlanAria} className="mt-3 grid gap-2.5">
          {!plans.length && loadState === 'loading' && [0, 1, 2].map((index) => <div key={index} aria-hidden="true" className="min-h-[4.75rem] animate-pulse rounded-[1.3rem] border-2 border-[#dfe7e3] bg-[#f6f8f7]" />)}
          {plans.map((plan) => {
            const active = plan.id === selected?.id;
            const offerPackage = checkoutPackage(plan, activeOffer);
            const price = firstPaymentPrice(offerPackage.webBillingProduct)?.formattedPrice ?? '…';
            // During the exit offer the crossed-out price is the price shown a moment ago, which is real.
            const was = exitOfferActive ? firstPaymentPrice(checkoutPackage(plan, 'welcome').webBillingProduct)?.formattedPrice : null;
            const perDayLabel = formatPerDay(perDayByPlan[plan.id] ?? null, priceLocale);
            const fits = plan.id === timelinePlan?.id;
            return (
              <button key={plan.id} type="button" role="radio" aria-checked={active} onClick={() => { setSelectedId(plan.id); saveSelectedPaywallPlan(plan.id); trackEvent('offer_selected', { offer_id: plan.id, provider: 'revenuecat', ...firstPaymentCommerce(offerPackage.webBillingProduct) }); }} className={cn('overflow-hidden rounded-[1.3rem] border-2 bg-white text-left transition focus:outline-none focus-visible:ring-4 focus-visible:ring-teal-brand/20 active:scale-[0.99]', active ? 'border-forest shadow-[0_12px_26px_rgb(23_69_58_/_0.12)]' : 'border-[#dfe7e3] hover:border-teal-brand/60')}>
                {fits && <span className="block bg-forest px-3 py-1 text-center text-[0.66rem] font-extrabold tracking-[0.02em] text-white">{funnelPaywall.fitsTimeline}</span>}
                <span className={cn('grid min-h-[4.75rem] grid-cols-[auto_1fr_auto] items-center gap-3 px-3.5 py-3', active && 'bg-[#f6fbf8]')}>
                  <span className={cn('grid h-6 w-6 place-items-center rounded-full border-2', active ? 'border-forest' : 'border-[#c8cfcc]')}>{active && <span className="h-3 w-3 rounded-full bg-forest" />}</span>
                  <span className="min-w-0">
                    <span className={cn('block text-[1.02rem] font-extrabold leading-tight', active ? 'text-[#111418]' : 'text-[#3f4744]')}>{planName(plan)}</span>
                    <span className="mt-1 block text-[0.76rem] font-bold leading-snug text-muted-brand">{was && <s className="mr-1 font-semibold opacity-70">{was}</s>}<span className="text-slate-brand">{price}</span> · {billedLabel(plan)}</span>
                  </span>
                  <span className={cn('min-w-[5.4rem] rounded-[1rem] px-2.5 py-2 text-center', active ? 'bg-[#e8f4ef] text-forest' : 'bg-[#f2f2f1] text-[#111418]')}>
                    <span className="block text-[1.32rem] font-extrabold leading-none tracking-[-0.04em] tabular-nums">{perDayLabel ?? price}</span>
                    <span className="mt-1 block text-[0.6rem] font-extrabold leading-none opacity-75">{perDayLabel ? copy.paywall.perDay : billedLabel(plan)}</span>
                  </span>
                </span>
              </button>
            );
          })}
        </div>
        {timeline && timelinePlan && <p className="mt-3 text-sm font-semibold leading-relaxed text-slate-brand">{funnelPaywall.timelineNote(timeline.weeks, planName(timelinePlan))}</p>}
        {isExitOfferMode && exitOfferActive && <p className="mt-1 text-sm font-medium text-muted-brand">{funnelPaywall.exitNote}</p>}
        <div className="mt-4">{checkoutButton}</div>
        <p className="mt-3 text-center text-[0.8rem] font-semibold leading-relaxed text-slate-brand">{renewalLine}</p>
        <p className="mt-1.5 text-center text-[0.76rem] font-medium leading-relaxed text-muted-brand">{funnelPaywall.cancelLine}</p>
        <p className="mt-1.5 text-center text-[0.76rem] font-medium leading-relaxed text-muted-brand">{funnelPaywall.accessLine}</p>
        <div className="mt-3 flex items-center justify-center gap-2 text-[0.72rem] font-bold text-muted-brand">
          <span>{funnelPaywall.payWith}</span>
          <span className="rounded-md border border-border-brand px-2 py-0.5 font-extrabold text-forest">💳 {funnelPaywall.card}</span>
          <span className="rounded-md border border-border-brand px-2 py-0.5 font-extrabold italic text-[#003087]">Pay<span className="text-[#009cde]">Pal</span></span>
        </div>
      </section>

      <AppStoreRating />

      <section className="rounded-[1.6rem] bg-white p-4 shadow-[0_18px_46px_rgb(23_69_58_/_0.08)] sm:p-5">
        <h2 className="text-[1.12rem] font-extrabold tracking-[-0.02em] text-forest">{funnelPaywall.includesTitle}</h2>
        <ul className="mt-3 grid gap-3">{funnelPaywall.includes.map((item, index) => <li key={item.title} className="grid grid-cols-[2.4rem_1fr] gap-3"><span className="grid h-9 w-9 place-items-center rounded-2xl bg-mist text-[1rem]" aria-hidden="true">{benefitEmoji[index] ?? '✅'}</span><span><span className="block text-[0.92rem] font-extrabold text-forest">{item.title}</span><span className="mt-0.5 block text-[0.84rem] leading-relaxed text-muted-brand">{item.body}</span></span></li>)}</ul>
      </section>

      <section className="rounded-[1.6rem] bg-white p-5 text-center shadow-[0_18px_46px_rgb(23_69_58_/_0.08)]">
        <Image src="/guarantee-30day.webp" alt="" width={160} height={160} className="mx-auto h-24 w-24 object-contain" />
        <h2 className="mt-2 text-[1.12rem] font-extrabold leading-tight text-[#111418]">{funnelPaywall.guaranteeTitle}</h2>
        <p className="mt-2 text-[0.84rem] font-medium leading-relaxed text-muted-brand">{funnelPaywall.guaranteeBody}</p>
      </section>

      <section className="rounded-[1.6rem] bg-white p-4 shadow-[0_18px_46px_rgb(23_69_58_/_0.08)] sm:p-5">
        <h2 className="text-[1.12rem] font-extrabold tracking-[-0.02em] text-forest">{funnelPaywall.faqTitle}</h2>
        <div className="mt-2 divide-y divide-border-brand/60">
          {funnelPaywall.faqs.map((faq) => (
            <details key={faq.q} className="group py-3">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-[0.95rem] font-extrabold text-forest">{faq.q}<span aria-hidden="true" className="text-teal-brand transition group-open:rotate-45">+</span></summary>
              <p className="mt-2 text-sm font-medium leading-relaxed text-slate-brand">{faq.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="rounded-[1.6rem] bg-white p-4 shadow-[0_18px_46px_rgb(23_69_58_/_0.08)]">
        <p className="text-center text-sm font-extrabold text-forest">{selected ? `${planName(selected)} · ${introTotal}` : ''}</p>
        <div className="mt-3">{checkoutButton}</div>
        <p className="mt-3 text-center text-[0.76rem] font-medium leading-relaxed text-muted-brand">{renewalLine}</p>
      </section>
      {statusNodes}
      <p className="mx-auto max-w-[38rem] px-4 text-center text-xs font-medium leading-relaxed text-muted-brand">{funnelPaywall.finePrint}</p>
    </div>
  );

  return (
    <ConversionShell
      hideLogo
      stickyHeader={plainPricing ? englishHeader : (
        <div className={cn('fixed left-1/2 top-0 z-50 w-full max-w-lg -translate-x-1/2 border-b px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] shadow-[0_12px_34px_rgb(16_39_32_/_0.12)] backdrop-blur-xl', exitOfferActive ? 'border-[#FDBA74] bg-[#FFF7ED]/95 supports-[backdrop-filter]:bg-[#FFF7ED]/85' : 'border-white/55 bg-white/70 supports-[backdrop-filter]:bg-white/60')}>
          <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3">
            <Link href={`/survey/${activeLocale}`} aria-label="Nutree" className="block h-11 w-11 shrink-0"><NutreeLogo priority className="h-11 w-11" /></Link>
            <div><p className={cn('text-[0.74rem] font-bold leading-tight', exitOfferActive ? 'text-[#9A3412]' : 'text-muted-brand')}>{headerOfferLabel}</p>{isOriginalPricing ? <p className="mt-0.5 text-[0.92rem] font-extrabold leading-tight text-forest">{copy.paywall.standardTimer}</p> : <strong aria-live="polite" className={cn('mt-0.5 inline-flex rounded-md px-1.5 py-0.5 text-[1.2rem] font-extrabold leading-none tracking-[-0.035em] tabular-nums', exitOfferActive ? 'bg-[#C2410C] text-white' : 'text-[#111418]')}>{countdown}</strong>}</div>
            <button type="button" disabled={!pricesReady || busy || checkoutUnavailable} onClick={requestCheckout} className={cn('min-h-11 rounded-[1rem] px-3.5 text-[0.78rem] font-extrabold text-white shadow-[0_10px_24px_rgb(23_69_58_/_0.20)] transition focus:outline-none focus-visible:ring-4 focus-visible:ring-teal-brand/25 active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-50 sm:px-4 sm:text-[0.86rem]', exitOfferActive ? 'bg-[#C2410C] hover:bg-[#9A3412]' : 'bg-forest hover:bg-emerald-deep')}>{busy ? copy.paywall.loading : copy.paywall.topCta}</button>
          </div>
        </div>
      )}
      className="gap-5"
    >
      {plainPricing ? englishBody : (
      <div className="pt-[5.75rem]">
        <section className="rounded-[2rem] bg-white p-5 shadow-[0_18px_46px_rgb(23_69_58_/_0.08)] sm:p-8">
          <p className="text-center text-[0.92rem] font-semibold text-slate-brand">{copy.paywall.goalIntro}</p>
          <h1 className="mx-auto mt-1 max-w-2xl text-center text-[1.28rem] font-extrabold leading-tight tracking-[-0.03em] text-forest sm:text-[1.55rem]">{system === 'metric' ? copy.paywall.goalHeadline(targetWeight, targetDate) : `${formatWeight(targetWeight, system)} by ${targetDate}`}</h1>
          <svg viewBox="0 0 640 245" className="mt-8 h-auto w-full" role="img" aria-label={copy.paywall.goalChartAria}><path d="M48 62 C132 65 156 86 213 130 S304 165 360 168" fill="none" stroke="#a3bd68" strokeWidth="6" strokeLinecap="round" /><path d="M360 168 H580" fill="none" stroke="#2d8b70" strokeWidth="6" strokeLinecap="round" /><circle cx="48" cy="62" r="9" fill="#d7a84d" /><circle cx="360" cy="168" r="12" fill="#2d8b70" stroke="white" strokeWidth="6" /><text x="62" y="52" fill="#6b7b75" fontSize="20" fontWeight="600">{formatWeight(currentWeight, system)}</text><text x="48" y="228" fill="#6b7b75" fontSize="17" fontWeight="700">{copy.paywall.now}</text><text x="580" y="228" textAnchor="end" fill="#6b7b75" fontSize="17" fontWeight="700">{targetDate}</text></svg>
          <p className="mx-auto mt-4 max-w-[35rem] text-center text-[0.9rem] leading-relaxed text-muted-brand">{copy.paywall.goalNote}</p>
        </section>

        <section className="mt-5 rounded-[2rem] bg-white p-3.5 shadow-[0_18px_46px_rgb(23_69_58_/_0.08)] sm:mt-6 sm:p-5">
          <h2 className="text-center text-[1.08rem] font-extrabold tracking-[-0.02em] text-forest sm:text-[1.18rem]">{copy.paywall.planTitle}</h2>
          {!isOriginalPricing && <p className={cn('mt-4 rounded-[1.15rem] px-3 py-2.5 text-center text-[0.84rem] font-extrabold tabular-nums', exitOfferActive ? 'bg-[#FFF7ED] text-[#9A3412] ring-1 ring-[#FDBA74]' : 'bg-[#e8f4ef] text-forest')}>{timerLabel}</p>}
          <div role="radiogroup" aria-label={copy.paywall.selectPlanAria} className="mt-5 grid gap-3">
            {!plans.length && loadState === 'loading' && [0, 1, 2].map((index) => <div key={index} aria-hidden="true" className="min-h-[5.25rem] animate-pulse rounded-[1.4rem] border-2 border-[#dfe7e3] bg-[#f6f8f7]" />)}
            {plans.map((plan) => {
              const active = plan.id === selected?.id;
              const offerPackage = checkoutPackage(plan, activeOffer);
              const hasOffer = offerPackage !== plan.rcPackage;
              const original = firstPaymentPrice(plan.rcPackage.webBillingProduct)?.formattedPrice ?? '…';
              const intro = firstPaymentPrice(offerPackage.webBillingProduct)?.formattedPrice ?? original;
              const perDayLabel = formatPerDay(perDayByPlan[plan.id] ?? null, priceLocale);
              const savings = savingsByPlan[plan.id];
              return <button key={plan.id} type="button" role="radio" aria-checked={active} onClick={() => { setSelectedId(plan.id); saveSelectedPaywallPlan(plan.id); trackEvent('offer_selected', { offer_id: plan.id, provider: 'revenuecat', ...firstPaymentCommerce(offerPackage.webBillingProduct) }); }} className={cn('overflow-hidden rounded-[1.4rem] border-2 bg-white text-left transition focus:outline-none focus-visible:ring-4 focus-visible:ring-teal-brand/20 active:scale-[0.99]', active ? 'border-[#ff5b1f] shadow-[0_12px_26px_rgb(255_106_31_/_0.10)]' : 'border-[#dfe7e3] hover:border-teal-brand/60')}>
                {plan.recommended && <span className="block bg-gradient-to-r from-[#ef4d59] to-[#ff781f] px-3 py-1.5 text-center text-[0.62rem] font-extrabold tracking-[0.02em] text-white">{copy.paywall.recommendedTag}</span>}
                <span className={cn('grid min-h-[5.6rem] grid-cols-[auto_1fr_auto] items-center gap-3 px-3.5 py-3.5', active && 'bg-[#fffafa]')}>
                  <span className={cn('grid h-6 w-6 place-items-center rounded-full border-2', active ? 'border-[#111418]' : 'border-[#c8cfcc]')}>{active && <span className="h-3 w-3 rounded-full bg-forest" />}</span>
                  <span className="min-w-0">
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className={cn('text-[1rem] font-extrabold leading-tight', active ? 'text-[#111418]' : 'text-[#5f6764]')}>{plan.label[activeLocale]}</span>
                      {savings !== undefined && <span className="rounded-full bg-[#e3f5ec] px-2 py-0.5 text-[0.64rem] font-extrabold leading-tight text-[#0f6b4a]">{copy.paywall.savePerDay(savings)}</span>}
                    </span>
                    {plan.description[activeLocale] && <span className="mt-1 block text-[0.76rem] font-semibold leading-snug text-muted-brand">{plan.description[activeLocale]}</span>}
                    <span className="mt-1.5 block text-[0.74rem] font-bold leading-snug text-muted-brand">{hasOffer && <s className="mr-1 font-semibold opacity-70">{original}</s>}<span className="text-slate-brand">{intro}</span> · {plan.billingLabel[activeLocale]}</span>
                  </span>
                  <span className={cn('min-w-[5.6rem] rounded-[1rem] px-2.5 py-2.5 text-center', active ? 'bg-[#fff1e8] text-[#c2410c]' : 'bg-[#f2f2f1] text-[#111418]')}>
                    <span className="block text-[1.42rem] font-extrabold leading-none tracking-[-0.04em] tabular-nums">{perDayLabel ? `~${perDayLabel}` : intro}</span>
                    <span className="mt-1.5 block text-[0.6rem] font-extrabold leading-none tracking-[0.02em] opacity-75">{perDayLabel ? `/ ${copy.paywall.perDay}` : plan.billingLabel[activeLocale]}</span>
                  </span>
                </span>
              </button>;
            })}
          </div>
          <p className="mt-3 text-center text-[0.7rem] font-semibold leading-snug text-muted-brand">{copy.paywall.perDayFootnote}</p>
          <p className="mt-5 text-[0.94rem] leading-relaxed text-slate-brand">{paywall.recommendationNote?.[activeLocale] ?? copy.paywall.planRecommendation}</p>
          <p className="mt-1.5 text-sm font-medium text-muted-brand">{offerNote}</p>
          <button type="button" disabled={!pricesReady || busy || checkoutUnavailable} onClick={requestCheckout} className="mt-5 min-h-14 w-full rounded-2xl bg-forest px-5 text-base font-extrabold text-white shadow-[0_14px_28px_rgb(23_69_58_/_0.22)] transition hover:bg-emerald-deep focus:outline-none focus-visible:ring-4 focus-visible:ring-teal-brand/25 active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-50">{busy ? copy.paywall.loading : copy.paywall.cta()}</button>
          <p className="mt-4 text-center text-sm leading-relaxed text-muted-brand">{priceSummary}</p>
        </section>

        <section className="mt-5 rounded-[2rem] bg-white p-5 shadow-[0_18px_46px_rgb(23_69_58_/_0.08)] sm:mt-6 sm:p-8"><h2 className="text-[1.2rem] font-extrabold tracking-[-0.03em] text-forest">{copy.paywall.includesTitle}</h2><div className="mt-5 grid gap-4">{benefits.map((benefit) => <div key={benefit.title} className="grid grid-cols-[2.55rem_1fr] gap-3"><span className="grid h-10 w-10 place-items-center rounded-2xl bg-mist text-[1.1rem]" aria-hidden="true">{benefit.icon}</span><div><h3 className="text-[0.92rem] font-extrabold text-forest">{benefit.title}</h3><p className="mt-0.5 text-[0.84rem] leading-relaxed text-muted-brand">{benefit.body}</p></div></div>)}</div></section>
        <section className="mt-5 rounded-[2rem] bg-white p-5 shadow-[0_18px_46px_rgb(23_69_58_/_0.08)] sm:mt-6 sm:p-8"><h2 className="text-[1.2rem] font-extrabold tracking-[-0.03em] text-forest">{copy.paywall.personalTitle}</h2><div className="mt-5 grid gap-4">{personalRows.map((row) => <div key={row.label} className="grid grid-cols-[2.55rem_1fr] items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-2xl bg-[#edf7f3] text-[1.1rem]" aria-hidden="true">{row.icon}</span><p className="text-[0.86rem] leading-relaxed text-muted-brand">{row.label} <strong className="font-extrabold text-forest">{row.value}</strong></p></div>)}</div></section>
        <section className="mt-5 rounded-[2rem] bg-white p-5 text-center shadow-[0_18px_46px_rgb(23_69_58_/_0.08)] sm:mt-6 sm:p-8"><Image src="/guarantee-30day.webp" alt="" width={160} height={160} className="mx-auto h-28 w-28 object-contain" /><h2 className="mt-3 text-[1.16rem] font-extrabold leading-tight tracking-[-0.025em] text-[#111418]">{copy.paywall.guaranteeTitle}</h2><p className="mt-3 text-[0.84rem] font-medium leading-relaxed text-muted-brand">{copy.paywall.guaranteeBody}</p></section>
        {statusNodes}
        <div className="mt-6 flex justify-center px-4"><BoCongThuongBadge alt={copy.common.bctBadgeAlt} /></div>
        <p className="mx-auto mt-3 max-w-[38rem] px-4 text-center text-xs font-medium leading-relaxed text-muted-brand">{copy.paywall.termsIntro} {copy.paywall.secure}</p>
      </div>
      )}
      <PaywallExitVoucher
        armed={!plainPricing && shouldArmExitVoucher({
          discountActive: welcomeOfferActive || exitOfferActive,
          checkoutOpen: showCheckoutConfirm || busy,
          purchased: checkoutUnavailable,
        })}
        onClaimed={() => {
          markWelcomeVoucherClaimed();
          const offer = createPaywallOffer('welcome');
          storePaywallOffer(offer);
          setOfferKind('welcome');
          setOfferExpiresAt(offer.expiresAt);
          setSecondsLeft(PAYWALL_WELCOME_OFFER_SECONDS);
        }}
      />
      {typeof document !== 'undefined' && createPortal(
        <>
      {showCheckoutConfirm && (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-[#111816]/52 px-5 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="checkout-confirm-title">
          <section className="w-full max-w-sm rounded-[2rem] bg-white p-7 text-center shadow-[0_28px_80px_rgb(10_18_16_/_0.34)]">
            <h2 id="checkout-confirm-title" className="text-2xl font-extrabold tracking-[-0.04em] text-forest">{confirmCopy.title}</h2>
            <p className="mt-3 text-sm font-medium leading-relaxed text-muted-brand">{confirmCopy.body}</p>
            <div className="mt-5 rounded-2xl bg-mist px-4 py-3 text-left"><p className="font-extrabold text-forest">{selectedLabel}</p><p className="mt-1 text-sm font-extrabold text-forest">{confirmPriceCopy.first}</p><p className="mt-1 text-xs font-semibold leading-relaxed text-muted-brand">{confirmPriceCopy.renewal}</p></div>
            <button autoFocus type="button" onClick={() => { setShowCheckoutConfirm(false); void openCheckout(activeOffer); }} className="mt-6 min-h-13 w-full rounded-2xl bg-forest px-5 font-extrabold text-white transition hover:bg-emerald-deep focus:outline-none focus-visible:ring-4 focus-visible:ring-teal-brand/25">{confirmCopy.continue}</button>
            <button type="button" onClick={() => setShowCheckoutConfirm(false)} className="mt-3 min-h-11 w-full text-sm font-bold text-muted-brand underline underline-offset-4">{confirmCopy.dismiss}</button>
          </section>
        </div>
      )}
        </>,
        document.body,
      )}
    </ConversionShell>
  );
}
