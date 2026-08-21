'use client';

import { ErrorCode, Purchases, PurchasesError, type Package, type Purchases as PurchasesInstance } from '@revenuecat/purchases-js';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ConversionShell } from '@/components/conversion-shell';
import { trackEvent, trackStepViewed } from '@/lib/analytics/track';
import { useCopy } from '@/lib/copy/use-copy';
import { getLocalPreviewCountry, isLocalPreviewHost, localPreviewData, localPreviewLead, localPreviewTdee } from '@/lib/local-preview';
import { createRevenueCatPaywallPlans, type RevenueCatPaywallPlan } from '@/lib/revenuecat/paywall-plans';
import { correlateRevenueCatCustomer } from '@/lib/api/client';
import { clearPendingRedemptionCorrelation, readPendingRedemptionCorrelation, redemptionHandoff, redemptionLinkHash, savePendingRedemptionCorrelation, type RedemptionHandoff } from '@/lib/revenuecat/redemption-handoff';
import { clearPaywallCheckoutPending, configureRevenueCatForAnonymousCheckout, configureRevenueCatForLead, discountedFormattedPrice, EXIT_DISCOUNT_CODE, EXIT_DISCOUNT_PERCENT, hasExitOfferBeenClaimed, markPaywallCheckoutPending, packagesByPlan, PAYWALL_EXIT_OFFER_SECONDS, PAYWALL_OFFER_STATE_STORAGE_KEY, readRevenueCatWebConfig, readSelectedPaywallPlan, saveSelectedPaywallPlan, WELCOME_DISCOUNT_CODE, WELCOME_DISCOUNT_PERCENT } from '@/lib/revenuecat/web';
import { useHydrated, useQuizStore } from '@/lib/quiz/store';
import { cn } from '@/lib/utils';

interface PaywallPageClientProps {
  initialCountryCode?: string;
  initialPlanId?: RevenueCatPaywallPlan['id'];
  exitOfferMode: boolean;
  oneWeekPlanEnabled: boolean;
  onMissingLead?: () => void;
  onCheckoutCancelled?: () => void;
}

type LoadState = 'loading' | 'ready' | 'error';
type PlanPackages = Partial<Record<RevenueCatPaywallPlan['id'], Package>>;
type CheckoutDiscount = 'welcome' | 'exit' | 'none';
type PaywallOfferKind = 'welcome' | 'exit';

interface StoredPaywallOffer {
  kind: PaywallOfferKind;
  expiresAt: number;
}

const OFFER_SECONDS = 600;
const benefitEmoji = ['📋', '📸', '🍽️', '🔥', '💬'];
const redemptionEnabled = process.env.NEXT_PUBLIC_REVENUECAT_REDEMPTION_ENABLED === 'true';

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

function goalDate(locale: 'vi' | 'en') {
  const date = new Date();
  date.setDate(date.getDate() + 182);
  return new Intl.DateTimeFormat(locale === 'vi' ? 'vi-VN' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
}

function isUserCancelledPurchase(error: unknown): boolean {
  return (error instanceof PurchasesError && error.errorCode === ErrorCode.UserCancelledError)
    || (typeof error === 'object' && error !== null && 'errorCode' in error && (error as { errorCode?: unknown }).errorCode === ErrorCode.UserCancelledError);
}

function ensureCheckoutRoot(): HTMLElement {
  const existing = document.getElementById('rcb-ui-root');
  if (existing) return existing;
  const root = document.createElement('div');
  root.id = 'rcb-ui-root';
  root.className = 'rcb-ui-root';
  document.body.appendChild(root);
  return root;
}

function observeCheckoutClosure(root: HTMLElement, onClosed: () => void): () => void {
  let mounted = false;
  let closeTimer: number | null = null;
  const isVisible = () => {
    const checkoutFrame = root.querySelector('iframe') ?? document.querySelector('iframe');
    const rootStyle = window.getComputedStyle(root);
    if (checkoutFrame) {
      const frameStyle = window.getComputedStyle(checkoutFrame);
      const frameRect = checkoutFrame.getBoundingClientRect();
      return frameStyle.display !== 'none' && frameStyle.visibility !== 'hidden' && frameRect.width > 0 && frameRect.height > 0;
    }
    if (root.childElementCount === 0 || rootStyle.display === 'none' || rootStyle.visibility === 'hidden') return false;
    const candidates = [root, ...Array.from(root.children)];
    return candidates.some((candidate) => {
      const rect = candidate.getBoundingClientRect();
      const style = window.getComputedStyle(candidate);
      return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
    });
  };
  const check = () => {
    if (isVisible()) {
      mounted = true;
      if (closeTimer !== null) window.clearTimeout(closeTimer);
      closeTimer = null;
      return;
    }
    if (!mounted || closeTimer !== null) return;
    closeTimer = window.setTimeout(() => {
      closeTimer = null;
      if (mounted && !isVisible()) onClosed();
    }, 250);
  };
  const observer = new MutationObserver(check);
  observer.observe(document.body, { childList: true, subtree: true });
  const poll = window.setInterval(check, 250);
  return () => {
    observer.disconnect();
    window.clearInterval(poll);
    if (closeTimer !== null) window.clearTimeout(closeTimer);
  };
}

export function PaywallPageClient({ initialCountryCode, initialPlanId, exitOfferMode, oneWeekPlanEnabled, onMissingLead, onCheckoutCancelled }: PaywallPageClientProps) {
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
  const [selectedId, setSelectedId] = useState<RevenueCatPaywallPlan['id']>(() => initialPlanId ?? readSelectedPaywallPlan() ?? '12-week');
  const [offerStateReady, setOfferStateReady] = useState(false);
  const [offerKind, setOfferKind] = useState<PaywallOfferKind>(exitOfferMode ? 'exit' : 'welcome');
  const [offerExpiresAt, setOfferExpiresAt] = useState<number | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [planPackages, setPlanPackages] = useState<PlanPackages>({});
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCheckoutConfirm, setShowCheckoutConfirm] = useState(false);
  const [redemption, setRedemption] = useState<RedemptionHandoff | null>(null);
  const purchasesRef = useRef<PurchasesInstance | null>(null);
  const anonymousAppUserIdRef = useRef<string | null>(null);
  const checkoutRef = useRef<{ leadId: string; purchases: PurchasesInstance; appUserId: string | null } | null>(null);
  const checkoutInFlightRef = useRef(false);
  const purchaseLeadIdRef = useRef<string | null>(null);
  const redemptionLinkHashRef = useRef<string | null>(null);
  const revenueCatPaywallPlans = useMemo(() => createRevenueCatPaywallPlans(oneWeekPlanEnabled), [oneWeekPlanEnabled]);

  const countryCode = initialCountryCode ?? (isLocalPreviewHost() ? getLocalPreviewCountry() : undefined);
  const selected = useMemo(
    () => revenueCatPaywallPlans.find((plan) => plan.id === selectedId) ?? revenueCatPaywallPlans[1],
    [revenueCatPaywallPlans, selectedId],
  );

  useEffect(() => trackStepViewed('paywall'), []);

  useEffect(() => {
    if (!exitOfferMode || !window.location.search) return;
    window.history.replaceState(window.history.state, '', window.location.pathname + window.location.hash);
  }, [exitOfferMode]);

  useEffect(() => {
    const now = Date.now();
    const offer = exitOfferMode && !hasExitOfferBeenClaimed() ? createPaywallOffer('exit', now) : readStoredPaywallOffer() ?? createPaywallOffer('welcome', now);
    storePaywallOffer(offer);
    const readyTimer = window.setTimeout(() => {
      setOfferKind(offer.kind);
      setOfferExpiresAt(offer.expiresAt);
      setSecondsLeft(Math.max(0, Math.ceil((offer.expiresAt - Date.now()) / 1000)));
      setOfferStateReady(true);
    }, 0);
    return () => window.clearTimeout(readyTimer);
  }, [exitOfferMode]);

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
    setLocale(countryCode === 'VN' ? 'vi' : 'en');
    setTdee(localPreviewTdee, 'fallback');
  }, [countryCode, hydrated, lead, onMissingLead, setData, setLead, setLocale, setTdee]);

  useEffect(() => {
    let cancelled = false;

    async function loadRevenueCatOffering() {
      try {
        const config = readRevenueCatWebConfig(undefined, oneWeekPlanEnabled);
        if (!lead) throw new Error('Your checkout draft is unavailable. Return to email capture to continue.');
        const pendingCorrelation = redemptionEnabled ? readPendingRedemptionCorrelation() : null;
        const pendingAppUserId = pendingCorrelation?.leadId === lead.lead_id ? pendingCorrelation.appUserId : null;
        const checkout = checkoutRef.current?.leadId === lead.lead_id
          ? checkoutRef.current
          : {
              leadId: lead.lead_id,
              ...(redemptionEnabled
                ? pendingAppUserId
                  ? { appUserId: pendingAppUserId, purchases: Purchases.configure({ apiKey: config.apiKey, appUserId: pendingAppUserId }) }
                  : configureRevenueCatForAnonymousCheckout(config)
                : { purchases: configureRevenueCatForLead(config, lead.lead_id), appUserId: null }),
            };
        checkoutRef.current = checkout;
        const purchases = checkout.purchases;
        anonymousAppUserIdRef.current = checkout.appUserId;
        purchasesRef.current = purchases;
        const offerings = await purchases.getOfferings({
          offeringIdentifier: config.offeringIdentifier,
          ...(countryCode === 'VN' ? { currency: 'VND' } : { currency: 'USD' }),
        });
        const offering = offerings.all[config.offeringIdentifier];
        if (!offering) throw new Error('RevenueCat could not find the configured web offering.');
        const nextPackages = packagesByPlan(offering.availablePackages, config.plans);
        if (config.plans.some((plan) => !nextPackages[plan.id])) {
          throw new Error('RevenueCat offering is missing one or more configured Nutree packages.');
        }
        if (!cancelled) {
          setError(null);
          setPlanPackages(nextPackages);
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
  }, [countryCode, lead, oneWeekPlanEnabled]);

  const correlatePurchasedCustomer = useCallback(async () => {
    if (loadState !== 'ready' || !lead || !anonymousAppUserIdRef.current || !redemptionLinkHashRef.current) return;
    try {
      const acknowledgedLead = await correlateRevenueCatCustomer(lead.lead_id, anonymousAppUserIdRef.current, redemptionLinkHashRef.current);
      setLead(acknowledgedLead);
      clearPendingRedemptionCorrelation(lead.lead_id);
      setRedemption(redemptionHandoff({ correlationAcknowledged: true, redemptionLinkHash: redemptionLinkHashRef.current }));
    } catch {
      // A completed provider payment must never reopen checkout while verification retries.
      setRedemption({ kind: 'pending' });
    }
  }, [lead, loadState, setLead]);

  useEffect(() => {
    if (!hydrated || !lead || !redemptionEnabled || redemptionLinkHashRef.current) return;
    const pendingCorrelation = readPendingRedemptionCorrelation();
    if (pendingCorrelation?.leadId !== lead.lead_id) return;
    purchaseLeadIdRef.current = lead.lead_id;
    redemptionLinkHashRef.current = pendingCorrelation.redemptionLinkHash;
  }, [hydrated, lead]);

  useEffect(() => {
    const hasPersistedCorrelation = redemptionEnabled && lead && readPendingRedemptionCorrelation()?.leadId === lead.lead_id;
    if (redemption?.kind !== 'pending' && !hasPersistedCorrelation) return;
    const retry = window.setTimeout(() => { void correlatePurchasedCustomer(); }, 15_000);
    return () => window.clearTimeout(retry);
  }, [correlatePurchasedCustomer, lead, redemption]);

  const openCheckout = useCallback(async (discount: CheckoutDiscount = 'welcome') => {
    const rcPackage = planPackages[selected.id];
    if (checkoutInFlightRef.current || purchaseLeadIdRef.current === lead?.lead_id) return;
    if (!purchasesRef.current || !lead || !rcPackage) {
      setError('RevenueCat checkout is still loading. Please try again in a moment.');
      return;
    }
    checkoutInFlightRef.current = true;
    setBusy(true);
    setError(null);
    const isExitOffer = discount === 'exit';
    const isWelcomeOffer = discount === 'welcome';
    let cancellationHandled = false;
    let purchaseSettled = false;
    let cleanupCheckoutClosure = () => {};
    const applyCheckoutCancellation = () => {
      if (cancellationHandled) return;
      cancellationHandled = true;
      cleanupCheckoutClosure();
      checkoutInFlightRef.current = false;
      setBusy(false);
      clearPaywallCheckoutPending();
      if (isExitOffer || hasExitOfferBeenClaimed()) return;
      setError(null);
      saveSelectedPaywallPlan(selected.id);
      trackEvent('revenuecat_checkout_cancelled', { plan: selected.id });
      trackEvent('exit_offer_shown', { plan: selected.id, discount_code: EXIT_DISCOUNT_CODE });
      onCheckoutCancelled?.();
    };
    const handleCheckoutCancellation = () => {
      if (purchaseSettled) applyCheckoutCancellation();
    };
    const handleCheckoutHistoryChange = () => handleCheckoutCancellation();
    window.addEventListener('popstate', handleCheckoutHistoryChange);
    cleanupCheckoutClosure = observeCheckoutClosure(ensureCheckoutRoot(), handleCheckoutCancellation);
    trackEvent('revenuecat_checkout_started', { plan: selected.id, package_id: rcPackage.identifier, country_code: countryCode ?? 'auto' });

    try {
      markPaywallCheckoutPending();
      const purchaseParameters = {
        rcPackage,
        selectedLocale: activeLocale,
        defaultLocale: 'en',
        skipSuccessPage: true,
        ...(isExitOffer
          ? { discountCode: EXIT_DISCOUNT_CODE }
          : isWelcomeOffer
            ? { discountCode: WELCOME_DISCOUNT_CODE }
            : {}),
      } as Parameters<PurchasesInstance['purchase']>[0];
      const purchaseResult = await purchasesRef.current.purchase(purchaseParameters);
      purchaseSettled = true;
      clearPaywallCheckoutPending();
      trackEvent('revenuecat_checkout_completed', { plan: selected.id });
      if (!redemptionEnabled || !anonymousAppUserIdRef.current) {
        router.push('/welcome');
        return;
      }
      purchaseLeadIdRef.current = lead.lead_id;
      redemptionLinkHashRef.current = await redemptionLinkHash(purchaseResult.redemptionInfo?.redeemUrl);
      if (!redemptionLinkHashRef.current) {
        setRedemption({ kind: 'recovery' });
        return;
      }
      savePendingRedemptionCorrelation({ leadId: lead.lead_id, appUserId: anonymousAppUserIdRef.current, redemptionLinkHash: redemptionLinkHashRef.current });
      setRedemption({ kind: 'pending' });
      await correlatePurchasedCustomer();
      router.push('/postcheckout');
    } catch (purchaseError) {
      purchaseSettled = true;
      if (isUserCancelledPurchase(purchaseError) && !isExitOffer) {
        applyCheckoutCancellation();
        return;
      }
      clearPaywallCheckoutPending();
      setError(purchaseError instanceof Error ? purchaseError.message : 'RevenueCat could not complete checkout. Please try again.');
    } finally {
      cleanupCheckoutClosure();
      window.removeEventListener('popstate', handleCheckoutHistoryChange);
      checkoutInFlightRef.current = false;
      setBusy(false);
    }
  }, [activeLocale, countryCode, correlatePurchasedCustomer, lead, onCheckoutCancelled, planPackages, router, selected]);

  const requestCheckout = () => {
    if (redemptionEnabled && lead && readPendingRedemptionCorrelation()?.leadId === lead.lead_id) {
      setRedemption({ kind: 'pending' });
      return;
    }
    if (!purchasesRef.current || !lead || !pricesReady) {
      setError('RevenueCat checkout is still loading. Please try again in a moment.');
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
  const persistedCorrelation = redemptionEnabled && lead && readPendingRedemptionCorrelation()?.leadId === lead.lead_id;
  const displayedRedemption = redemption ?? (persistedCorrelation ? ({ kind: 'pending' } satisfies RedemptionHandoff) : redemptionEnabled && lead?.status === 'payment_verified' ? ({ kind: 'email_sent' } satisfies RedemptionHandoff) : null);
  const checkoutUnavailable = Boolean(displayedRedemption);
  const personalRows = [
    { icon: '🔥', label: copy.paywall.goalLabel, value: goal },
    { icon: '🎯', label: copy.paywall.personalizedFor, value: gender },
    { icon: '🥦', label: copy.paywall.calorieLabel, value: tdee ? `${Math.round(tdee.calories).toLocaleString(activeLocale === 'vi' ? 'vi-VN' : 'en-US')} kcal` : copy.paywall.calorieFallback },
    { icon: '🚶', label: copy.paywall.activityLabel, value: copy.paywall.activityValue(data.training_days_per_week ?? 0) },
  ];
  const selectedProduct = planPackages[selected.id]?.webBillingProduct;
  const selectedOriginalPrice = selectedProduct?.introPricePhase?.price ?? selectedProduct?.price;
  const originalTotal = selectedOriginalPrice?.formattedPrice ?? '…';
  const isExitOfferMode = offerKind === 'exit';
  const exitOfferActive = isExitOfferMode && secondsLeft > 0;
  const welcomeOfferActive = !isExitOfferMode && secondsLeft > 0;
  const offerDiscountPercent = isExitOfferMode ? (exitOfferActive ? EXIT_DISCOUNT_PERCENT : 0) : (welcomeOfferActive ? WELCOME_DISCOUNT_PERCENT : 0);
  const introTotal = discountedFormattedPrice(selectedOriginalPrice, activeLocale === 'vi' ? 'vi-VN' : 'en-US', offerDiscountPercent) ?? originalTotal;
  const renewalTotal = selectedProduct?.price.formattedPrice ?? '…';
  const pricesReady = loadState === 'ready';
  const offerNote = exitOfferActive
    ? (activeLocale === 'vi' ? `Ưu đãi giảm ${EXIT_DISCOUNT_PERCENT}% đã được áp dụng cho tất cả gói.` : `Your ${EXIT_DISCOUNT_PERCENT}% offer applies to every plan.`)
    : isExitOfferMode
      ? (activeLocale === 'vi' ? `Ưu đãi giảm ${EXIT_DISCOUNT_PERCENT}% đã hết hạn. Giá đã trở về giá gốc cho tất cả gói.` : `The ${EXIT_DISCOUNT_PERCENT}% offer has expired. Prices have returned to the original amount for every plan.`)
      : welcomeOfferActive
        ? copy.paywall.planResearchNote
        : (activeLocale === 'vi' ? 'Ưu đãi đã hết hạn. Giá đã trở về giá gốc cho tất cả gói.' : 'The offer has expired. Prices have returned to the original amount for every plan.');
  const renewalCadence = activeLocale === 'vi' ? `mỗi ${selected.label.vi}` : `every ${selected.label.en.replace('-week', ' weeks')}`;
  const priceSummary = exitOfferActive
    ? (activeLocale === 'vi'
      ? `Ưu đãi giảm ${EXIT_DISCOUNT_PERCENT}% áp dụng cho mọi gói. Bạn thanh toán ${introTotal} hôm nay, sau đó gói tự gia hạn theo giá đầy đủ ${renewalTotal} ${renewalCadence} cho đến khi bạn hủy.`
      : `Your ${EXIT_DISCOUNT_PERCENT}% offer applies to every plan. You pay ${introTotal} today, then ${renewalTotal} ${renewalCadence} until you cancel.`)
    : isExitOfferMode
      ? (activeLocale === 'vi'
        ? `Ưu đãi đã hết hạn. Bạn thanh toán ${originalTotal} hôm nay, sau đó gói tự gia hạn theo giá đầy đủ ${renewalTotal} ${renewalCadence} cho đến khi bạn hủy.`
        : `The offer has expired. You pay ${originalTotal} today, then ${renewalTotal} ${renewalCadence} until you cancel.`)
      : welcomeOfferActive
        ? copy.paywall.exactPriceSummary(originalTotal, introTotal, renewalTotal, selected.label[activeLocale])
        : (activeLocale === 'vi'
          ? `Ưu đãi đã hết hạn. Bạn thanh toán ${originalTotal} hôm nay, sau đó gói tự gia hạn theo giá đầy đủ ${renewalTotal} ${renewalCadence} cho đến khi bạn hủy.`
          : `The offer has expired. You pay ${originalTotal} today, then ${renewalTotal} ${renewalCadence} until you cancel.`);
  const headerOfferLabel = exitOfferActive
    ? (activeLocale === 'vi' ? `Ưu đãi · Giảm ${EXIT_DISCOUNT_PERCENT}%` : `${EXIT_DISCOUNT_PERCENT}% off offer`)
    : isExitOfferMode
      ? (activeLocale === 'vi' ? `Ưu đãi giảm ${EXIT_DISCOUNT_PERCENT}% đã hết hạn` : `${EXIT_DISCOUNT_PERCENT}% offer expired`)
    : welcomeOfferActive
      ? (activeLocale === 'vi' ? 'Ưu đãi Nutree Premium' : 'Nutree Premium offer')
      : (activeLocale === 'vi' ? 'Ưu đãi đã hết hạn' : 'Offer expired');
  const timerLabel = isExitOfferMode
    ? (secondsLeft > 0
      ? (activeLocale === 'vi' ? `Ưu đãi giảm ${EXIT_DISCOUNT_PERCENT}% kết thúc sau: ${countdown}` : `${EXIT_DISCOUNT_PERCENT}% offer ends in: ${countdown}`)
      : (activeLocale === 'vi' ? `Ưu đãi giảm ${EXIT_DISCOUNT_PERCENT}% đã hết hạn` : `${EXIT_DISCOUNT_PERCENT}% offer expired`))
    : secondsLeft > 0 ? copy.paywall.offerEnds(countdown) : (activeLocale === 'vi' ? 'Xem giá hiện tại của bạn' : 'See your current price');
  const confirmCopy = activeLocale === 'vi'
    ? { title: 'Xác nhận gói của bạn', body: 'Bạn sẽ mở thanh toán bảo mật của Nutree cho gói đã chọn.', continue: 'Tiếp tục thanh toán', dismiss: 'Quay lại' }
    : { title: 'Confirm your plan', body: 'You’ll open Nutree’s secure checkout for the plan you selected.', continue: 'Continue to checkout', dismiss: 'Go back' };

  if (!hydrated || !lead || !offerStateReady) return null;

  return (
    <ConversionShell
      hideLogo
      stickyHeader={(
        <div className={cn('fixed left-1/2 top-0 z-50 w-full max-w-lg -translate-x-1/2 border-b px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] shadow-[0_12px_34px_rgb(16_39_32_/_0.12)] backdrop-blur-xl', exitOfferActive ? 'border-[#FDBA74] bg-[#FFF7ED]/95 supports-[backdrop-filter]:bg-[#FFF7ED]/85' : 'border-white/55 bg-white/70 supports-[backdrop-filter]:bg-white/60')}>
          <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3">
            <Link href={`/survey/${activeLocale}`} aria-label="Nutree" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/70 bg-white/75 shadow-[inset_0_0_0_1px_rgb(255_255_255_/_0.5),0_2px_8px_rgb(16_39_32_/_0.06)] backdrop-blur"><Image src="/nutree-logo-simple.png" alt="" width={72} height={64} priority className="h-7 w-7 object-contain" /></Link>
            <div><p className={cn('text-[0.74rem] font-bold leading-tight', exitOfferActive ? 'text-[#9A3412]' : 'text-muted-brand')}>{headerOfferLabel}</p><strong aria-live="polite" className={cn('mt-0.5 inline-flex rounded-md px-1.5 py-0.5 text-[1.2rem] font-extrabold leading-none tracking-[-0.035em] tabular-nums', exitOfferActive ? 'bg-[#C2410C] text-white' : 'text-[#111418]')}>{countdown}</strong></div>
            <button type="button" disabled={!pricesReady || busy || checkoutUnavailable} onClick={requestCheckout} className={cn('min-h-11 rounded-[1rem] px-3.5 text-[0.78rem] font-extrabold text-white shadow-[0_10px_24px_rgb(23_69_58_/_0.20)] transition focus:outline-none focus-visible:ring-4 focus-visible:ring-teal-brand/25 active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-50 sm:px-4 sm:text-[0.86rem]', exitOfferActive ? 'bg-[#C2410C] hover:bg-[#9A3412]' : 'bg-forest hover:bg-emerald-deep')}>{busy ? copy.paywall.loading : copy.paywall.topCta}</button>
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
          <p className={cn('mt-4 rounded-[1.15rem] px-3 py-2.5 text-center text-[0.84rem] font-extrabold tabular-nums', exitOfferActive ? 'bg-[#FFF7ED] text-[#9A3412] ring-1 ring-[#FDBA74]' : 'bg-[#e8f4ef] text-forest')}>{timerLabel}</p>
          <div role="radiogroup" aria-label={copy.paywall.selectPlanAria} className="mt-5 grid gap-3">
            {revenueCatPaywallPlans.map((plan) => {
              const active = plan.id === selected.id;
              const product = planPackages[plan.id]?.webBillingProduct;
              const originalPrice = product?.introPricePhase?.price ?? product?.price;
              const original = originalPrice?.formattedPrice ?? '…';
              const intro = discountedFormattedPrice(originalPrice, activeLocale === 'vi' ? 'vi-VN' : 'en-US', offerDiscountPercent) ?? original;
              const renewal = product?.price.formattedPrice ?? '…';
              return <button key={plan.id} type="button" role="radio" aria-checked={active} onClick={() => { setSelectedId(plan.id); saveSelectedPaywallPlan(plan.id); trackEvent('offer_selected', { offer_id: plan.id, provider: 'revenuecat' }); }} className={cn('overflow-hidden rounded-[1.4rem] border-2 bg-white text-left transition focus:outline-none focus-visible:ring-4 focus-visible:ring-teal-brand/20 active:scale-[0.99]', active ? 'border-[#ff5b1f] shadow-[0_12px_26px_rgb(255_106_31_/_0.10)]' : 'border-[#dfe7e3] hover:border-teal-brand/60')}>
                {plan.recommended && <span className="block bg-gradient-to-r from-[#ef4d59] to-[#ff781f] px-3 py-1.5 text-center text-[0.62rem] font-extrabold uppercase tracking-[0.18em] text-white">{copy.paywall.recommendedTag}</span>}
                <span className={cn('grid min-h-[5.25rem] grid-cols-[auto_1fr_auto] items-center gap-3 px-3 py-3', active && 'bg-[#fffafa]')}><span className={cn('grid h-6 w-6 place-items-center rounded-full border-2', active ? 'border-[#111418]' : 'border-[#c8cfcc]')}>{active && <span className="h-3 w-3 rounded-full bg-forest" />}</span><span><span className={cn('block text-[0.98rem] font-extrabold', active ? 'text-[#111418]' : 'text-[#5f6764]')}>{plan.label[activeLocale]}</span><span className="mt-1 block text-[0.76rem] font-semibold text-muted-brand">{plan.description[activeLocale]}</span>{offerDiscountPercent > 0 && <span className="mt-2 block text-[0.78rem] font-bold text-muted-brand line-through">{renewal}</span>}</span><span className="min-w-[5.2rem] rounded-[0.9rem] bg-[#f2f2f1] px-2 py-2 text-center text-[#111418]">{offerDiscountPercent > 0 && <span className="block text-[0.68rem] font-bold leading-none text-muted-brand line-through">{original}</span>}<span className={cn('block text-[1.38rem] font-extrabold leading-none tracking-[-0.04em]', offerDiscountPercent > 0 && 'mt-1')}>{intro}</span><span className="mt-1 block text-[0.58rem] font-extrabold leading-none text-muted-brand">{plan.billingLabel[activeLocale]}</span></span></span>
              </button>;
            })}
          </div>
          <p className="mt-5 text-[0.94rem] leading-relaxed text-slate-brand">{copy.paywall.planRecommendation}</p>
          <p className="mt-1.5 text-sm font-medium text-muted-brand">{offerNote}</p>
          <button type="button" disabled={!pricesReady || busy || checkoutUnavailable} onClick={requestCheckout} className="mt-5 min-h-14 w-full rounded-2xl bg-forest px-5 text-base font-extrabold text-white shadow-[0_14px_28px_rgb(23_69_58_/_0.22)] transition hover:bg-emerald-deep focus:outline-none focus-visible:ring-4 focus-visible:ring-teal-brand/25 active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-50">{busy ? copy.paywall.loading : copy.paywall.cta()}</button>
          <p className="mt-4 text-center text-sm leading-relaxed text-muted-brand">{priceSummary}</p>
        </section>

        <section className="mt-5 rounded-[2rem] bg-white p-5 shadow-[0_18px_46px_rgb(23_69_58_/_0.08)] sm:mt-6 sm:p-8"><h2 className="text-[1.2rem] font-extrabold tracking-[-0.03em] text-forest">{copy.paywall.includesTitle}</h2><div className="mt-5 grid gap-4">{benefits.map((benefit) => <div key={benefit.title} className="grid grid-cols-[2.55rem_1fr] gap-3"><span className="grid h-10 w-10 place-items-center rounded-2xl bg-mist text-[1.1rem]" aria-hidden="true">{benefit.icon}</span><div><h3 className="text-[0.92rem] font-extrabold text-forest">{benefit.title}</h3><p className="mt-0.5 text-[0.84rem] leading-relaxed text-muted-brand">{benefit.body}</p></div></div>)}</div></section>
        <section className="mt-5 rounded-[2rem] bg-white p-5 shadow-[0_18px_46px_rgb(23_69_58_/_0.08)] sm:mt-6 sm:p-8"><h2 className="text-[1.2rem] font-extrabold tracking-[-0.03em] text-forest">{copy.paywall.personalTitle}</h2><div className="mt-5 grid gap-4">{personalRows.map((row) => <div key={row.label} className="grid grid-cols-[2.55rem_1fr] items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-2xl bg-[#edf7f3] text-[1.1rem]" aria-hidden="true">{row.icon}</span><p className="text-[0.86rem] leading-relaxed text-muted-brand">{row.label} <strong className="font-extrabold text-forest">{row.value}</strong></p></div>)}</div></section>
        <section className="mt-5 rounded-[2rem] bg-white p-5 text-center shadow-[0_18px_46px_rgb(23_69_58_/_0.08)] sm:mt-6 sm:p-8"><Image src="/guarantee-30day.webp" alt="" width={160} height={160} className="mx-auto h-28 w-28 object-contain" /><h2 className="mt-3 text-[1.16rem] font-extrabold leading-tight tracking-[-0.025em] text-[#111418]">{copy.paywall.guaranteeTitle}</h2><p className="mt-3 text-[0.84rem] font-medium leading-relaxed text-muted-brand">{copy.paywall.guaranteeBody}</p></section>
        {error && <p role="alert" className="mt-5 rounded-2xl bg-white px-4 py-3 text-sm font-bold text-error-brand">{error}</p>}
        {displayedRedemption?.kind === 'pending' && <p role="status" className="mt-5 rounded-2xl bg-white px-4 py-3 text-sm font-bold text-slate-brand">{activeLocale === 'vi' ? 'Đang xác minh thanh toán của bạn…' : 'Verifying your payment…'}</p>}
        {displayedRedemption?.kind === 'recovery' && <section className="mt-5 rounded-2xl bg-white px-5 py-5 text-center shadow-[0_18px_46px_rgb(23_69_58_/_0.08)]"><h2 className="text-lg font-extrabold text-forest">{activeLocale === 'vi' ? 'Thanh toán đã được ghi nhận' : 'Payment received'}</h2><p className="mt-2 text-sm leading-relaxed text-muted-brand">{activeLocale === 'vi' ? 'Chúng tôi không thể xác minh liên kết kích hoạt. Vui lòng kiểm tra email thanh toán của bạn hoặc liên hệ hỗ trợ.' : 'We could not verify your activation link. Check your purchase email or contact support.'}</p></section>}
        {displayedRedemption?.kind === 'email_sent' && <section className="mt-5 rounded-2xl bg-white px-5 py-5 text-center shadow-[0_18px_46px_rgb(23_69_58_/_0.08)]"><h2 className="text-lg font-extrabold text-forest">{activeLocale === 'vi' ? 'Kiểm tra email của bạn' : 'Check your email'}</h2><p className="mt-2 text-sm leading-relaxed text-muted-brand">{activeLocale === 'vi' ? 'RevenueCat đã gửi liên kết bảo mật đến email thanh toán. Mở liên kết đó trong Nutree và đăng nhập Google hoặc Apple bằng cùng email để kích hoạt gói.' : 'RevenueCat sent a secure link to your checkout email. Open it in Nutree and sign in with Google or Apple using the same email to activate your plan.'}</p></section>}
        <p className="mx-auto mt-6 max-w-[38rem] px-4 text-center text-xs font-medium leading-relaxed text-muted-brand">{copy.paywall.termsIntro} {copy.paywall.secure}</p>
      </div>
      {typeof document !== 'undefined' && createPortal(
        <>
      {showCheckoutConfirm && (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-[#111816]/52 px-5 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="checkout-confirm-title">
          <section className="w-full max-w-sm rounded-[2rem] bg-white p-7 text-center shadow-[0_28px_80px_rgb(10_18_16_/_0.34)]">
            <h2 id="checkout-confirm-title" className="text-2xl font-extrabold tracking-[-0.04em] text-forest">{confirmCopy.title}</h2>
            <p className="mt-3 text-sm font-medium leading-relaxed text-muted-brand">{confirmCopy.body}</p>
            <div className="mt-5 rounded-2xl bg-mist px-4 py-3 text-left"><p className="font-extrabold text-forest">{selected.label[activeLocale]}</p>{offerDiscountPercent > 0 && <p className="mt-1 text-xs font-bold text-muted-brand line-through">{originalTotal}</p>}<p className="mt-1 text-sm font-extrabold text-forest">{introTotal} {activeLocale === 'vi' ? 'hôm nay' : 'today'}{offerDiscountPercent > 0 ? ` · ${offerDiscountPercent}% OFF` : activeLocale === 'vi' ? ' · Giá gốc' : ' · Original price'}</p><p className="mt-1 text-xs font-semibold text-muted-brand">{renewalTotal} {selected.billingLabel[activeLocale]}</p></div>
            <button autoFocus type="button" onClick={() => { setShowCheckoutConfirm(false); void openCheckout(exitOfferActive ? 'exit' : welcomeOfferActive ? 'welcome' : 'none'); }} className="mt-6 min-h-13 w-full rounded-2xl bg-forest px-5 font-extrabold text-white transition hover:bg-emerald-deep focus:outline-none focus-visible:ring-4 focus-visible:ring-teal-brand/25">{confirmCopy.continue}</button>
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
