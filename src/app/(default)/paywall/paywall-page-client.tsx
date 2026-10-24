'use client';

import { ErrorCode, Purchases, type Product, type Purchases as PurchasesInstance } from '@revenuecat/purchases-js';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal, flushSync, preconnect, preload } from 'react-dom';
import { BoCongThuongBadge } from '@/components/bo-cong-thuong-badge';
import { ConversionShell } from '@/components/conversion-shell';
import { NutreeLogo } from '@/components/nutree-logo';
import { stripNonAttributionParams } from '@/lib/analytics/attribution';
import { identifyMetaUser } from '@/lib/analytics/meta-identity';
import { identifyFunnelLead, registerPriceTestVariant } from '@/lib/analytics/posthog';
import { trackEvent, trackStepViewed } from '@/lib/analytics/track';
import { useCopy } from '@/lib/copy/use-copy';
import { getLocalPreviewCountry, isLocalPreviewHost, localPreviewData, localPreviewLead, localPreviewTdee } from '@/lib/local-preview';
import { normalizeCountryCode } from '@/lib/market/country';
import { clearPaywallCheckoutPending, configureRevenueCatForAnonymousCheckout, dismissCheckoutOverlay, EXIT_DISCOUNT_PERCENT, hasExitOfferBeenClaimed, hasPaywallCheckoutPending, markExitOfferClaimed, markPaywallCheckoutPending, paddleCheckoutClosedWithoutPayment, paddleCheckoutCompleted, paddleCheckoutIsOpen, PAYWALL_EXIT_OFFER_SECONDS, PAYWALL_OFFER_STATE_STORAGE_KEY, PAYWALL_WELCOME_OFFER_SECONDS, priceTestVariant, readRevenueCatWebConfig, readSelectedPaywallPlan, saveSelectedPaywallPlan, WELCOME_DISCOUNT_PERCENT } from '@/lib/revenuecat/web';
import { firstPaymentCommerce, formatPerDay, planPerDay, type OfferClaim } from '@/lib/revenuecat/plan-pricing';
import { correlateRevenueCatCustomer } from '@/lib/api/client';
import { syncRevenueCatAttribution } from '@/lib/revenuecat/attribution-attributes';
import { completePurchasedCheckout } from '@/lib/revenuecat/purchase-handoff';
import { clearPendingRedemptionCorrelation, readPendingRedemptionCorrelation, redemptionHandoff, type RedemptionHandoff } from '@/lib/revenuecat/redemption-handoff';
import { usePostcheckoutRedirect } from '@/lib/revenuecat/use-postcheckout-redirect';
import { resolvePaywallPricing } from '@/lib/revenuecat/paywall-offer-state';
import { buildRevenueCatPaywall, checkoutPackage, defaultPaywallPlan, SIX_MONTH_PLAN_ID, type PaywallOfferKind, type RevenueCatPaywall, type RevenueCatPaywallPlan } from '@/lib/revenuecat/paywall-plans';
import { hasWelcomeVoucherBeenClaimed, markWelcomeVoucherClaimed } from '@/lib/revenuecat/welcome-voucher';
import { clearCheckoutEmail, readCheckoutEmail } from '@/lib/revenuecat/checkout-email';
import { isUserPurchased, useHydrated, useQuizStore } from '@/lib/quiz/store';
import { formatWeight } from '@/lib/quiz/units';
import { AppIncludesCard, GoalStrip, PlanDayCard, PlanGoalCard } from '@/components/plan/plan-overview';
import { TrustCard } from '@/components/value-tour/value-tour-demos';
import { Icon } from '@/components/ui/icons';
import { WelcomeGiftScreen } from '@/components/welcome-gift-screen';
import { periodWeeks, planForTimeline } from '@/lib/quiz/plan-content';
import { formatGoalDate, goalTimeline } from '@/lib/quiz/progress-projection';
import { localPreviewOffering } from '@/lib/revenuecat/local-preview-offering';
import { computeTdeeResult } from '@/lib/tdee/calculator';
import { PAYWALL_AUTOSTART_KEY } from '@/lib/funnel/plan-link';
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
// English claims its welcome price on the gift screen and keeps it for 10 minutes before prices return to full.
const ENGLISH_WELCOME_SECONDS = 600;

/**
 * In-page checkout (both languages): RevenueCat draws Paddle's payment form inside our checkout sheet
 * instead of the full-screen popup. On by default; NEXT_PUBLIC_INLINE_CHECKOUT=0 brings the popup back.
 * RevenueCat falls back to the popup unless inline checkout is also on in its Paddle settings.
 */
const INLINE_CHECKOUT = process.env.NEXT_PUBLIC_INLINE_CHECKOUT !== '0';

/**
 * Wallet badges for payment methods switched on in Paddle (Apple Pay and Google Pay are on).
 * NEXT_PUBLIC_CHECKOUT_WALLETS overrides the list, e.g. "google_pay" alone, or "none" to hide both.
 */
const CHECKOUT_WALLETS = process.env.NEXT_PUBLIC_CHECKOUT_WALLETS
  ? process.env.NEXT_PUBLIC_CHECKOUT_WALLETS.split(',').map((wallet) => wallet.trim()).filter(Boolean)
  : ['apple_pay', 'google_pay'];

function ApplePayBadge() {
  return (
    <span className="inline-flex h-7 items-center gap-0.5 rounded-md bg-black px-2 text-[0.8rem] font-semibold text-white" aria-label="Apple Pay">
      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor" aria-hidden="true"><path d="M16.37 12.6c-.02-2.2 1.8-3.26 1.88-3.31-1.03-1.5-2.62-1.7-3.18-1.73-1.35-.14-2.64.8-3.33.8-.69 0-1.74-.78-2.86-.76-1.47.02-2.83.86-3.59 2.17-1.53 2.65-.39 6.58 1.1 8.73.73 1.05 1.6 2.23 2.73 2.19 1.1-.04 1.51-.71 2.84-.71 1.32 0 1.7.71 2.86.69 1.18-.02 1.93-1.07 2.65-2.13.84-1.22 1.18-2.4 1.2-2.46-.03-.01-2.3-.88-2.3-3.48ZM14.2 6.13c.6-.73 1.01-1.75.9-2.76-.87.03-1.92.58-2.54 1.31-.56.64-1.05 1.67-.92 2.66.97.08 1.96-.49 2.56-1.21Z" /></svg>
      <span aria-hidden="true">Pay</span>
    </span>
  );
}

function GooglePayBadge() {
  return (
    <span className="inline-flex h-7 items-center gap-1 rounded-md border border-border-brand bg-white px-2 text-[0.8rem] font-semibold text-[#3c4043]" aria-label="Google Pay">
      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" aria-hidden="true">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09Z" />
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23Z" />
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84Z" />
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53Z" />
      </svg>
      <span aria-hidden="true">Pay</span>
    </span>
  );
}

function formatCountdown(seconds: number) {
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}

function createPaywallOffer(kind: PaywallOfferKind, now = Date.now(), welcomeSeconds = OFFER_SECONDS): StoredPaywallOffer {
  return { kind, expiresAt: now + (kind === 'exit' ? PAYWALL_EXIT_OFFER_SECONDS : welcomeSeconds) * 1000 };
}

/** A plan link with start=1 opens checkout directly, so it skips the welcome gift. */
function autostartPending() {
  try {
    return window.sessionStorage.getItem(PAYWALL_AUTOSTART_KEY) === '1';
  } catch {
    return false;
  }
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

/**
 * RevenueCat formats prices in the browser's language, so an English phone shows "₫59,000".
 * Each market's currency is shown its own way instead: VND as "59.000 ₫", USD as "$7.99".
 */
function marketPrice<T extends { amountMicros: number; currency: string; formattedPrice: string }>(price: T): T {
  const vnd = price.currency === 'VND';
  const formattedPrice = new Intl.NumberFormat(vnd ? 'vi-VN' : 'en-US', {
    style: 'currency',
    currency: price.currency,
    ...(vnd ? { maximumFractionDigits: 0 } : {}),
  }).format(price.amountMicros / 1_000_000);
  return { ...price, formattedPrice };
}

function firstPaymentPrice(product: Product | null | undefined) {
  const price = product?.introPricePhase?.price ?? product?.price ?? null;
  return price ? marketPrice(price) : null;
}

function renewalPrice(product: Product | null | undefined) {
  return product?.price ? marketPrice(product.price) : null;
}

/** The offer's headline percent (50% welcome, 75% exit), the figure every label shows. */
function offerPercent(offer: PaywallOfferKind): number {
  return offer === 'exit' ? EXIT_DISCOUNT_PERCENT : WELCOME_DISCOUNT_PERCENT;
}

/** What an offer claims: its headline percent, once at least one plan has a lower price under it. */
function offerClaimFor(plans: RevenueCatPaywallPlan[], offer: PaywallOfferKind | null): OfferClaim | null {
  if (!offer) return null;
  const cheaper = plans.some((plan) => (firstPaymentPrice(checkoutPackage(plan, offer).webBillingProduct)?.amountMicros ?? Infinity)
    < (firstPaymentPrice(plan.rcPackage.webBillingProduct)?.amountMicros ?? 0));
  return cheaper ? { percent: offerPercent(offer), upTo: false } : null;
}

/** The date a plan bought today is next charged: after the intro period when there is one. */
function nextChargeDate(product: Product | null | undefined, from = new Date()): Date | null {
  const intro = product?.introPricePhase;
  return renewalDate(intro?.price ? intro.period : product?.period, from);
}

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
  // An automatically applied welcome offer is reported once the prices are in, with its real discount.
  const autoAppliedPendingRef = useRef(false);
  const plans = paywall.plans;

  const countryCode = initialCountryCode ?? (isLocalPreviewHost() ? getLocalPreviewCountry() : undefined);
  const resolvedCountryCode = normalizeCountryCode(countryCode) ?? 'VN';
  // English shows the price people pay as the price: no countdown, crossed-out price or "% off"
  // while the plans renew at the discounted price. Only the exit offer, which really ends, keeps a timer.
  const plainPricing = activeLocale === 'en';
  const welcomeSeconds = plainPricing ? ENGLISH_WELCOME_SECONDS : OFFER_SECONDS;
  const inlineCheckout = INLINE_CHECKOUT;
  // Paddle's script and checkout frame otherwise start loading only after the first tap. Fetch the script
  // and open the connections while the plans are read, so the sheet's payment buttons appear sooner.
  // Only fetched, not run: RevenueCat injects the same script tag later and the browser reuses this copy.
  if (inlineCheckout) {
    preconnect('https://cdn.paddle.com');
    // The RevenueCat key decides live or sandbox Paddle, so warm both frame hosts.
    preconnect('https://buy.paddle.com');
    preconnect('https://sandbox-buy.paddle.com');
    preconnect('https://api.revenuecat.com');
    preload('https://cdn.paddle.com/paddle/v2/paddle.js', { as: 'script' });
  }
  const [checkoutSheetOpen, setCheckoutSheetOpen] = useState(false);
  // Closing checkout without paying applies the exit price under a scratch card, so the person uncovers it.
  const [exitGiftOpen, setExitGiftOpen] = useState(false);
  // Local preview has no RevenueCat, so the sheet shows a placeholder frame and its own close button.
  const [checkoutPreview, setCheckoutPreview] = useState(false);
  // RevenueCat empties and fills this element itself, so React never renders children into it.
  const checkoutHostRef = useRef<HTMLDivElement>(null);
  // A close tapped before RevenueCat has mounted in the sheet, carried out as soon as it has.
  const cancelRequestedRef = useRef(false);
  // The sheet shows the offer the checkout was started with, even if its timer runs out meanwhile.
  const [checkoutOffer, setCheckoutOffer] = useState<PaywallOfferKind | null>(null);
  // Once Paddle reports the payment, the sheet can no longer be closed: RevenueCat is confirming it.
  const [checkoutPaid, setCheckoutPaid] = useState(false);
  // Paddle's own totals for the open checkout (tax included), reported by the patched RevenueCat SDK.
  const [paddleTotals, setPaddleTotals] = useState<{ currencyCode: string; taxAmount: number; totalAmount: number; recurringTotalAmount: number | null } | null>(null);
  useEffect(() => {
    if (!checkoutSheetOpen) return;
    const onTotals = (event: Event) => {
      const detail = (event as CustomEvent<{ currencyCode?: unknown; taxAmount?: unknown; totalAmount?: unknown; recurringTotalAmount?: unknown }>).detail;
      if (typeof detail?.currencyCode === 'string' && typeof detail.totalAmount === 'number') {
        setPaddleTotals({
          currencyCode: detail.currencyCode,
          taxAmount: typeof detail.taxAmount === 'number' ? detail.taxAmount : 0,
          totalAmount: detail.totalAmount,
          recurringTotalAmount: typeof detail.recurringTotalAmount === 'number' ? detail.recurringTotalAmount : null,
        });
      }
    };
    window.addEventListener('rcb-checkout-totals', onTotals);
    return () => {
      window.removeEventListener('rcb-checkout-totals', onTotals);
      setPaddleTotals(null);
    };
  }, [checkoutSheetOpen]);
  // Read once on the client: a gift claimed earlier in this tab, or a plan link that opens checkout, skips the gift.
  const [giftSkipped, setGiftSkipped] = useState(() => typeof window !== 'undefined' && (hasWelcomeVoucherBeenClaimed() || autostartPending()));
  const timeline = useMemo(() => goalTimeline(data), [data]);
  // The header names the goal until the plan picker scrolls into view, then the price.
  const [plansSeen, setPlansSeen] = useState(false);
  const plansObserver = useRef<IntersectionObserver | null>(null);
  const observePlans = useCallback((node: HTMLElement | null) => {
    plansObserver.current?.disconnect();
    if (!node || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      setPlansSeen(true);
      observer.disconnect();
    }, { rootMargin: '0px 0px -35% 0px' });
    observer.observe(node);
    plansObserver.current = observer;
  }, []);
  const timelinePlan = useMemo(
    () => planForTimeline(plans, (plan) => periodWeeks(plan.rcPackage.webBillingProduct.period), timeline?.weeks ?? null),
    [plans, timeline],
  );
  const selected = useMemo(
    () => plans.find((plan) => plan.id === selectedId) ?? (plainPricing ? timelinePlan : undefined) ?? defaultPaywallPlan(plans),
    [plainPricing, plans, selectedId, timelinePlan],
  );

  usePostcheckoutRedirect(hydrated && isUserPurchased({ purchased, lead }));

  useEffect(() => {
    // Every later event carries the price-test arm, so the test reads in PostHog.
    const variant = resolvedCountryCode === 'VN' ? null : priceTestVariant();
    if (variant) registerPriceTestVariant(variant);
    trackStepViewed('paywall');
  }, [resolvedCountryCode]);

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
      welcomeSeconds,
      exitSeconds: PAYWALL_EXIT_OFFER_SECONDS,
    });
    if (resumeUnfinishedPaddle) {
      saveSelectedPaywallPlan(SIX_MONTH_PLAN_ID);
      markExitOfferClaimed();
    }
    if (pricing.mode !== 'original') storePaywallOffer({ kind: pricing.mode, expiresAt: pricing.expiresAt });
    if (pricing.mode === 'welcome' && pricing.autoApplied) autoAppliedPendingRef.current = true;
    const readyTimer = window.setTimeout(() => {
      if (resumeUnfinishedPaddle) setSelectedId(SIX_MONTH_PLAN_ID);
      setOfferKind(pricing.mode);
      setOfferExpiresAt(pricing.mode === 'original' ? null : pricing.expiresAt);
      setSecondsLeft(pricing.mode === 'original' ? 0 : Math.max(0, Math.ceil((pricing.expiresAt - Date.now()) / 1000)));
      setOfferStateReady(true);
    }, 0);
    return () => window.clearTimeout(readyTimer);
  }, [exitOfferMode, hydrated, welcomeSeconds]);

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
        // Branding loads before purchase() can start, so fetch it now rather than on the first tap.
        void purchases.preload();
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

  // Closing checkout without paying (our X, or Paddle's own close) moves every plan to the exit price
  // and, when the offering has exit packages, uncovers that price on a scratch card first.
  const applyExitOffer = useCallback(() => {
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
    const exitClaim = offerClaimFor(plans, 'exit');
    trackEvent('exit_offer_claimed', { discount_percent: exitClaim?.percent, plan: SIX_MONTH_PLAN_ID });
    if (exitClaim) setExitGiftOpen(true);
  }, [plans]);

  const openCheckout = useCallback(async (offer: PaywallOfferKind | null) => {
    const plan = selected;
    if (checkoutInFlightRef.current || purchaseLeadIdRef.current === lead?.lead_id) return;
    if (!purchasesRef.current || !lead || !plan || !anonymousAppUserIdRef.current) {
      setError('RevenueCat checkout is still loading. Please try again in a moment.');
      return;
    }
    const customerEmail = readCheckoutEmail();
    if (customerEmail) identifyMetaUser({ email: customerEmail, externalId: lead.lead_id, firstName: data.name });
    // Mount the sheet now, so its host element exists when RevenueCat starts drawing.
    if (inlineCheckout && customerEmail) {
      flushSync(() => {
        setCheckoutOffer(offer);
        setCheckoutPaid(false);
        setCheckoutSheetOpen(true);
      });
    }
    if (!customerEmail) {
      setError(activeLocale === 'vi' ? 'Vui lòng quay lại bước email để xác nhận địa chỉ thanh toán trước khi mua.' : 'We need your email before checkout. Go back to the email step to add it.');
      return;
    }
    checkoutInFlightRef.current = true;
    paddleOpenedRef.current = false;
    purchaseSucceededRef.current = false;
    cancelRequestedRef.current = false;
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
      if (isExitOffer || purchaseSucceededRef.current || isUserPurchased({ purchased, lead })) return;
      trackEvent('revenuecat_checkout_cancelled', { plan: plan.id, paddle_opened: paddleOpenedRef.current });
      applyExitOffer();
    };
    const rcPackage = checkoutPackage(plan, offer);
    const checkoutCommerce = firstPaymentCommerce(rcPackage.webBillingProduct);
    trackEvent('revenuecat_checkout_started', { plan: plan.id, package_id: rcPackage.identifier, offer_kind: offer ?? 'original', offer_auto_applied: offer === 'welcome' && !hasWelcomeVoucherBeenClaimed(), country_code: countryCode ?? 'auto', ...checkoutCommerce });
    void syncRevenueCatAttribution(purchasesRef.current);

    watchPaddle = window.setInterval(() => {
      if (purchaseSucceededRef.current) return;
      const cancelInlineCheckout = (checkoutHostRef.current as (HTMLDivElement & { rcbCancelCheckout?: () => void }) | null)?.rcbCancelCheckout;
      if (cancelRequestedRef.current && cancelInlineCheckout) {
        cancelRequestedRef.current = false;
        cancelInlineCheckout();
        return;
      }
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
        setCheckoutPaid(true);
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
        ...(inlineCheckout && checkoutHostRef.current ? { htmlTarget: checkoutHostRef.current } : {}),
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
      if (purchaseSucceededRef.current) {
        // Paddle took the payment but the confirmation did not finish here. Never offer a discount
        // or another checkout, now or after a reload; point the buyer to the purchase email instead.
        clearPaywallCheckoutPending();
        purchaseLeadIdRef.current = lead.lead_id;
        setRedemption({ kind: 'recovery' });
        return;
      }
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
      setCheckoutSheetOpen(false);
    }
  }, [activeLocale, applyExitOffer, countryCode, correlatePurchasedCustomer, data.name, inlineCheckout, lead, purchased, resolvedCountryCode, router, selected, setPurchased]);

  const countdown = formatCountdown(secondsLeft);
  const persistedCorrelation = Boolean(lead && readPendingRedemptionCorrelation()?.leadId === lead.lead_id);
  const displayedRedemption = redemption ?? (persistedCorrelation ? ({ kind: 'pending' } satisfies RedemptionHandoff) : lead?.status === 'payment_verified' ? ({ kind: 'email_sent' } satisfies RedemptionHandoff) : null);
  const checkoutUnavailable = Boolean(displayedRedemption);
  const selectedLabel = selected?.label[activeLocale] ?? '';
  const renewalCadence = selected?.billingLabel[activeLocale].toLowerCase() ?? '';
  const isOriginalPricing = offerKind === 'original';
  const isExitOfferMode = offerKind === 'exit';
  const exitOfferActive = isExitOfferMode && secondsLeft > 0;
  const welcomeOfferActive = offerKind === 'welcome' && secondsLeft > 0;
  const activeOffer: PaywallOfferKind | null = exitOfferActive ? 'exit' : welcomeOfferActive ? 'welcome' : null;
  const selectedOriginalPrice = firstPaymentPrice(selected?.rcPackage.webBillingProduct);
  const selectedOfferProduct = selected ? checkoutPackage(selected, activeOffer).webBillingProduct : null;
  const selectedOfferPrice = firstPaymentPrice(selectedOfferProduct);
  const originalTotal = selectedOriginalPrice?.formattedPrice ?? '…';
  const introTotal = selectedOfferPrice?.formattedPrice ?? originalTotal;
  const renewalTotal = renewalPrice(selectedOfferProduct)?.formattedPrice ?? '…';
  const offerDiscountPercent = selectedOfferProduct !== selected?.rcPackage.webBillingProduct
    ? (activeOffer === 'exit' ? EXIT_DISCOUNT_PERCENT : WELCOME_DISCOUNT_PERCENT)
    : 0;
  const priceLocale = activeLocale === 'vi' ? 'vi-VN' : 'en-US';
  const perDayByPlan = Object.fromEntries(plans.map((plan) => [plan.id, planPerDay(checkoutPackage(plan, activeOffer).webBillingProduct)]));
  const pricesReady = loadState === 'ready';
  // Discount claims come from the real package prices, never a fixed percent: null until they load.
  const welcomeClaim = pricesReady ? offerClaimFor(plans, 'welcome') : null;
  // The paywall opens on the welcome gift while an unclaimed welcome price is running. The card cannot be
  // scratched until the prices are in, so it never reveals a discount the plans do not have; an offering
  // without welcome packages closes it once the prices show that.
  const giftOpen = offerStateReady && welcomeOfferActive && !giftSkipped && (!pricesReady || welcomeClaim != null);
  const exitClaim = pricesReady ? offerClaimFor(plans, 'exit') : null;
  const activeClaim = pricesReady ? offerClaimFor(plans, activeOffer) : null;
  useEffect(() => {
    if (!offerStateReady || loadState === 'loading' || !autoAppliedPendingRef.current) return;
    autoAppliedPendingRef.current = false;
    trackEvent('welcome_offer_auto_applied', { discount_percent: welcomeClaim?.percent, offer_auto_applied: true });
  }, [loadState, offerStateReady, welcomeClaim?.percent]);
  const requestCheckout = () => {
    if (lead && readPendingRedemptionCorrelation()?.leadId === lead.lead_id) {
      setRedemption({ kind: 'pending' });
      return;
    }
    if (inlineCheckout && isLocalPreviewHost() && !purchasesRef.current) {
      setCheckoutPreview(true);
      setCheckoutOffer(activeOffer);
      setCheckoutSheetOpen(true);
      return;
    }
    if (!purchasesRef.current || !lead || !pricesReady) {
      setError('RevenueCat checkout is still loading. Please try again in a moment.');
      return;
    }
    setError(null);
    // The in-page sheet carries the order lines and renewal terms, so it opens straight away in both languages;
    // without it, Vietnamese confirms first.
    if (plainPricing || inlineCheckout) void openCheckout(activeOffer);
    else setShowCheckoutConfirm(true);
  };
  // The header button shows the plans before it opens checkout, so no checkout appears before a price has.
  // Marking the plans seen makes the next tap open checkout even where IntersectionObserver is missing.
  const onHeaderCta = () => {
    if (!plansSeen) {
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      document.getElementById('plans')?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
      setPlansSeen(true);
      trackEvent('paywall_header_cta', { action: 'scroll' });
      return;
    }
    trackEvent('paywall_header_cta', { action: 'checkout' });
    requestCheckout();
  };

  // A plan link with start=1 opens checkout once, as soon as the prices are in.
  const autostartRef = useRef(false);
  const requestCheckoutRef = useRef(requestCheckout);
  useEffect(() => {
    requestCheckoutRef.current = requestCheckout;
  });
  useEffect(() => {
    if (loadState !== 'ready' || autostartRef.current) return;
    let autostart = false;
    try {
      autostart = window.sessionStorage.getItem(PAYWALL_AUTOSTART_KEY) === '1';
      window.sessionStorage.removeItem(PAYWALL_AUTOSTART_KEY);
    } catch {
      // No storage, no autostart.
    }
    if (!autostart) return;
    autostartRef.current = true;
    document.getElementById('plans')?.scrollIntoView({ block: 'start' });
    // Outside the effect: flushSync cannot mount the checkout sheet from inside one.
    const timer = window.setTimeout(() => requestCheckoutRef.current(), 0);
    return () => window.clearTimeout(timer);
  }, [loadState]);

  // RevenueCat hides its back button inside our element, so closing goes through the patched SDK's cancel hook:
  // the purchase rejects as cancelled and the usual cleanup runs, which applies the exit price. After payment
  // it does nothing. Local preview has no RevenueCat: it closes and applies the exit price directly.
  const closeCheckoutSheet = useCallback(() => {
    if (purchaseSucceededRef.current) return;
    const cancel = (checkoutHostRef.current as (HTMLDivElement & { rcbCancelCheckout?: () => void }) | null)?.rcbCancelCheckout;
    if (cancel) cancel();
    // RevenueCat is still loading and has not mounted yet: the Paddle watcher cancels once it has.
    else if (checkoutInFlightRef.current) cancelRequestedRef.current = true;
    else {
      setCheckoutSheetOpen(false);
      if (checkoutPreview && checkoutOffer !== 'exit') applyExitOffer();
    }
  }, [applyExitOffer, checkoutOffer, checkoutPreview]);
  // Escape closes the sheet wherever focus is, except inside Paddle's frame, which keeps its keys.
  useEffect(() => {
    if (!checkoutSheetOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeCheckoutSheet();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [checkoutSheetOpen, closeCheckoutSheet]);

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
  const cadenceOf = (plan: (typeof plans)[number]) => {
    const period = plan.rcPackage.webBillingProduct.period;
    return period ? funnelPaywall.cadence(period.number, periodWord(period)) : plan.billingLabel[activeLocale].toLowerCase();
  };
  const selectedPeriod = selected?.rcPackage.webBillingProduct.period;
  const nextCharge = nextChargeDate(selectedOfferProduct);
  const renewalLine = funnelPaywall.renewal(
    introTotal,
    renewalTotal,
    selectedPeriod ? funnelPaywall.cadence(selectedPeriod.number, periodWord(selectedPeriod)) : renewalCadence,
    nextCharge ? formatGoalDate(nextCharge, activeLocale) : '',
  );
  const targetLabel = timeline ? formatWeight(timeline.targetKg, system, activeLocale) : null;
  const englishCta = targetLabel ? funnelPaywall.cta(targetLabel) : funnelPaywall.ctaFallback;
  const statusNodes = (
    <>
        {error && <p role="alert" className="mt-5 rounded-2xl bg-white px-4 py-3 text-sm font-bold text-error-brand">{error}</p>}
        {displayedRedemption?.kind === 'pending' && <p role="status" className="mt-5 rounded-2xl bg-white px-4 py-3 text-sm font-bold text-slate-brand">{activeLocale === 'vi' ? 'Đang xác minh thanh toán của bạn…' : 'Verifying your payment…'}</p>}
        {displayedRedemption?.kind === 'recovery' && <section className="mt-5 rounded-2xl bg-white px-5 py-5 text-center shadow-[0_18px_46px_rgb(23_69_58_/_0.08)]"><h2 className="text-lg font-extrabold text-forest">{activeLocale === 'vi' ? 'Thanh toán đã được ghi nhận' : 'Payment received'}</h2><p className="mt-2 text-sm leading-relaxed text-muted-brand">{activeLocale === 'vi' ? 'Chúng tôi không thể xác minh liên kết kích hoạt. Vui lòng kiểm tra email thanh toán của bạn hoặc liên hệ hỗ trợ.' : 'We could not verify your activation link. Check your purchase email or contact support.'}</p></section>}
        {displayedRedemption?.kind === 'email_sent' && <section className="mt-5 rounded-2xl bg-white px-5 py-5 text-center shadow-[0_18px_46px_rgb(23_69_58_/_0.08)]"><h2 className="text-lg font-extrabold text-forest">{activeLocale === 'vi' ? 'Kiểm tra email của bạn' : 'Check your email'}</h2><p className="mt-2 text-sm leading-relaxed text-muted-brand">{activeLocale === 'vi' ? 'Nutree đã gửi liên kết đến email thanh toán. Mở liên kết trên điện thoại để đăng nhập với kế hoạch của bạn.' : 'We sent a link to your checkout email. Open it on your phone to sign in with your plan.'}</p></section>}
    </>
  );

  if (!hydrated || !lead || !offerStateReady) return null;

  // While a discount runs, the header is just the offer, its countdown and the button; otherwise the plan and its price.
  const offerRunning = welcomeOfferActive || exitOfferActive;
  const checkoutWallets = CHECKOUT_WALLETS;
  const englishHeader = (
    <div className={cn('fixed left-1/2 top-0 z-50 w-full max-w-lg -translate-x-1/2 border-b px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] shadow-[0_12px_34px_rgb(16_39_32_/_0.12)] backdrop-blur-xl', exitOfferActive ? 'border-[#FDBA74] bg-[#FFF7ED]/95' : 'border-white/55 bg-white/90')}>
      <div className={cn('grid items-center gap-3', offerRunning ? 'grid-cols-[1fr_auto]' : 'grid-cols-[auto_1fr_auto]')}>
        {!offerRunning && <Link href={`/survey/${activeLocale}`} aria-label="Nutree" className="block h-11 w-11 shrink-0"><NutreeLogo priority className="h-11 w-11" /></Link>}
        <div className="min-w-0">
          {offerRunning ? (
            <>
              <p className={cn('flex items-center gap-1 whitespace-nowrap text-[0.74rem] font-bold leading-tight', exitOfferActive ? 'text-[#9A3412]' : 'text-slate-brand')}>
                <Icon name="gift" className={cn('h-4 w-4', exitOfferActive ? 'text-[#C2410C]' : 'text-[#c0263f]')} />
                <span>{exitOfferActive ? funnelPaywall.exitHeader : funnelPaywall.welcomeReserved(activeClaim)}</span>
              </p>
              <strong aria-live="polite" className="mt-0.5 block text-[1.55rem] font-extrabold leading-none tracking-[-0.02em] tabular-nums text-charcoal">{countdown}</strong>
            </>
          ) : (
            <>
              <p className="truncate text-[0.74rem] font-bold leading-tight text-muted-brand">{data.name?.trim() ? copy.funnel.plan.eyebrow(data.name.trim()) : funnelPaywall.header}</p>
              <p className="mt-0.5 truncate text-[0.95rem] font-extrabold leading-tight text-forest">{!plansSeen && timeline && targetLabel ? copy.funnel.plan.goalHeadline(targetLabel, formatGoalDate(timeline.date, activeLocale)) : selected && pricesReady ? funnelPaywall.billedFor(introTotal, cadenceOf(selected)) : funnelPaywall.header}</p>
            </>
          )}
        </div>
        <button type="button" disabled={!pricesReady || busy || checkoutUnavailable} onClick={onHeaderCta} className={cn('min-h-12 shrink-0 rounded-[1rem] px-4 text-[0.86rem] font-extrabold text-white transition focus:outline-none focus-visible:ring-4 focus-visible:ring-teal-brand/25 active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-50', exitOfferActive ? 'bg-[#C2410C] shadow-[0_10px_24px_rgb(194_65_12_/_0.25)] hover:bg-[#9A3412]' : 'cta-premium', offerRunning && !busy && 'cta-attention')}><span>{busy ? copy.paywall.loading : funnelPaywall.topCta}</span></button>
      </div>
    </div>
  );

  // The sheet's prices come from the offer the checkout started with, which is the transaction Paddle charges.
  const sheetOfferProduct = selected ? checkoutPackage(selected, checkoutOffer).webBillingProduct : null;
  const sheetFullPrice = selectedOriginalPrice;
  const sheetOfferPrice = firstPaymentPrice(sheetOfferProduct);
  const formatMajor = (amount: number, currency: string) => new Intl.NumberFormat(currency === 'VND' ? 'vi-VN' : 'en-US', { style: 'currency', currency, ...(currency === 'VND' ? { maximumFractionDigits: 0 } : {}) }).format(amount);
  const sheetDiscount = sheetFullPrice && sheetOfferPrice && sheetFullPrice.amountMicros > sheetOfferPrice.amountMicros
    ? formatMajor((sheetFullPrice.amountMicros - sheetOfferPrice.amountMicros) / 1_000_000, sheetFullPrice.currency)
    : null;
  const sheetPercent = checkoutOffer ? offerPercent(checkoutOffer) : 0;
  // Paddle may charge in the visitor's local currency (e.g. VND on an English page), while the plan prices are
  // RevenueCat's (USD). Then the plan and discount amounts are left out rather than mixing two currencies.
  const mixedCurrency = paddleTotals != null && sheetFullPrice != null && paddleTotals.currencyCode !== sheetFullPrice.currency;
  // In that case the full price is carried over in Paddle's currency at the same full-to-offer ratio as the plans,
  // so the lines still read "full price, discount, total" in one currency.
  const roundMajor = (amount: number, currency: string) => (currency === 'VND' ? Math.round(amount / 1000) * 1000 : Math.round(amount * 100) / 100);
  const paddleFull = mixedCurrency && paddleTotals && sheetFullPrice && sheetOfferPrice && sheetOfferPrice.amountMicros > 0
    ? roundMajor(paddleTotals.totalAmount * (sheetFullPrice.amountMicros / sheetOfferPrice.amountMicros), paddleTotals.currencyCode)
    : null;
  const sheetFullLabel = paddleFull != null && paddleTotals ? formatMajor(paddleFull, paddleTotals.currencyCode) : (sheetFullPrice?.formattedPrice ?? originalTotal);
  const sheetDiscountLabel = paddleFull != null && paddleTotals
    ? (paddleFull > paddleTotals.totalAmount ? formatMajor(paddleFull - paddleTotals.totalAmount, paddleTotals.currencyCode) : null)
    : sheetDiscount;
  // Paddle's total wins once it arrives (it includes any tax); until then, the offer price.
  const sheetTotalLabel = paddleTotals ? formatMajor(paddleTotals.totalAmount, paddleTotals.currencyCode) : (sheetOfferPrice?.formattedPrice ?? originalTotal);
  const checkoutSheet = (
    // The overlay itself scrolls, so when Paddle's card form grows taller than the screen the whole sheet moves,
    // including from a swipe that starts on Paddle's frame (an inner scroll box would not take that swipe on iOS).
    <div
      className="fixed inset-0 z-[70] overflow-y-auto overscroll-contain bg-[rgb(9_22_18_/_0.5)] backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="checkout-sheet-title"
    >
      <div className="flex min-h-full items-center justify-center px-3 py-4">
      <div className="w-full max-w-md rounded-[1.75rem] bg-[#f2f4f3] px-5 pb-5 pt-3 shadow-[0_24px_60px_rgb(9_22_18_/_0.3)] animate-soft-enter">
        <div className="relative flex min-h-12 items-center justify-center">
          {!checkoutPaid && <button type="button" autoFocus onClick={closeCheckoutSheet} aria-label={funnelPaywall.checkout.close} className="absolute left-[-0.6rem] top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full text-charcoal transition hover:bg-black/[0.05] focus:outline-none focus-visible:ring-4 focus-visible:ring-teal-brand/25">
            <Icon name="close" className="h-5 w-5" />
          </button>}
          <h2 id="checkout-sheet-title" className="text-[1.2rem] font-extrabold text-charcoal">{funnelPaywall.checkout.title}</h2>
        </div>
        {/* The order as plain lines, like a receipt: the plan at full price, the discount, then what today's charge covers.
            Once Paddle reports its totals, the total is Paddle's own figure, tax included. */}
        {selected && (
          <div className="mt-2 text-[0.95rem] text-slate-brand">
            <p className="flex justify-between gap-3 py-1"><span>{funnelPaywall.checkout.planLine(plainPricing ? planName(selected) : selected.label[activeLocale])}</span><span className="tabular-nums">{sheetFullLabel}</span></p>
            {sheetDiscount && (
              <p className="flex justify-between gap-3 py-1"><span>{checkoutOffer === 'exit' ? funnelPaywall.checkout.offerLine(sheetPercent) : funnelPaywall.checkout.discountLine(sheetPercent)}</span>{sheetDiscountLabel && <span className="font-extrabold tabular-nums text-[#e5484d]">−{sheetDiscountLabel}</span>}</p>
            )}
            <div className="mt-2.5 border-y border-black/10 py-3 text-charcoal">
              <p className="flex items-baseline justify-between gap-3">
                <span className="font-extrabold">{funnelPaywall.checkout.total}</span>
                <span className="text-right">
                  <strong className="text-[1.1rem] tabular-nums">{sheetTotalLabel}</strong>
                  {selectedPeriod && funnelPaywall.checkout.totalFor('', selectedPeriod.number, periodWord(selectedPeriod))}
                </span>
              </p>
            </div>
            {/* Paddle's form states the charge and renewal date itself ("… now, then … every 6 months from …"). */}
            <p className="mt-2.5 text-center text-[0.76rem] leading-relaxed text-muted-brand">{funnelPaywall.checkout.futurePayments}</p>
          </div>
        )}
        <h3 className="mt-4 text-center text-[1.02rem] font-extrabold text-charcoal">{funnelPaywall.checkout.methodTitle}</h3>
        {/* Paddle's express form (one-tap wallets, then "Pay another way") sits in a white card, as a payment box would.
            Paddle's frame needs 312px, so the card has no side padding of its own and reaches into the sheet's
            (Paddle insets its buttons itself): 316px of frame at 360px wide, 346px at 390px.
            checkout-host lets RevenueCat's layout grow to its content and hides its own summary (see globals.css). */}
        <div className="-mx-3.5 mt-3 overflow-hidden rounded-[1.25rem] border border-black/[0.06] bg-white py-3">
          <div ref={checkoutHostRef} className="checkout-host min-h-[9rem]">
            {checkoutPreview && (
              <p className="grid min-h-[9rem] place-items-center rounded-xl border-2 border-dashed border-border-brand px-5 text-center text-sm font-semibold text-muted-brand">{funnelPaywall.checkout.previewFrame}</p>
            )}
          </div>
        </div>
        <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-[0.76rem] text-muted-brand"><Icon name="lock" className="h-3.5 w-3.5 shrink-0" />{funnelPaywall.checkout.ssl}</p>
      </div>
      </div>
    </div>
  );

  // One plan card for both languages: a coloured tag on top, the plan with its offer chip, the crossed-out and
  // offer price, and the per-day price in a box. The chip is the offer's headline percent (50% or 75%).
  const planCard = (plan: RevenueCatPaywallPlan, name: string, tag: string | null) => {
    const active = plan.id === selected?.id;
    const offerPackage = checkoutPackage(plan, activeOffer);
    const hasOffer = offerPackage !== plan.rcPackage;
    const original = firstPaymentPrice(plan.rcPackage.webBillingProduct)?.formattedPrice ?? '…';
    const intro = firstPaymentPrice(offerPackage.webBillingProduct)?.formattedPrice ?? original;
    const perDayLabel = formatPerDay(perDayByPlan[plan.id] ?? null, priceLocale);
    return (
      <button key={plan.id} type="button" role="radio" aria-checked={active} onClick={() => { setSelectedId(plan.id); saveSelectedPaywallPlan(plan.id); trackEvent('offer_selected', { offer_id: plan.id, provider: 'revenuecat', ...firstPaymentCommerce(offerPackage.webBillingProduct) }); }} className={cn('overflow-hidden rounded-[1.4rem] border-2 bg-white text-left transition focus:outline-none focus-visible:ring-4 focus-visible:ring-teal-brand/20 active:scale-[0.99]', active ? 'border-[#ff5b1f] shadow-[0_12px_26px_rgb(255_106_31_/_0.10)]' : 'border-[#dfe7e3] hover:border-teal-brand/60')}>
        {tag && <span className="block bg-gradient-to-r from-[#ef4d59] to-[#ff781f] px-3 py-1.5 text-center text-[0.62rem] font-extrabold tracking-[0.02em] text-white">{tag}</span>}
        <span className={cn('grid min-h-[5.6rem] grid-cols-[auto_1fr_auto] items-center gap-3 px-3.5 py-3.5', active && 'bg-[#fffafa]')}>
          <span className={cn('grid h-6 w-6 place-items-center rounded-full border-2', active ? 'border-[#111418]' : 'border-[#c8cfcc]')}>{active && <span className="h-3 w-3 rounded-full bg-forest" />}</span>
          <span className="min-w-0">
            <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className={cn('text-[1rem] font-extrabold leading-tight', active ? 'text-[#111418]' : 'text-[#5f6764]')}>{name}</span>
              {hasOffer && activeOffer && <span className="rounded-full bg-[#e3f5ec] px-2 py-0.5 text-[0.64rem] font-extrabold leading-tight text-[#0f6b4a]">{copy.paywall.offerChip(offerPercent(activeOffer))}</span>}
            </span>
            {plan.description[activeLocale] && <span className="mt-1 block text-[0.76rem] font-semibold leading-snug text-muted-brand">{plan.description[activeLocale]}</span>}
            <span className="mt-1.5 block text-[0.74rem] font-bold leading-snug text-muted-brand">{hasOffer && <><s className="font-semibold opacity-70">{original}</s>{' '}</>}<span className="text-slate-brand">{intro}</span> · {plan.billingLabel[activeLocale]}</span>
          </span>
          <span className={cn('min-w-[5.6rem] rounded-[1rem] px-2.5 py-2.5 text-center', active ? 'bg-[#fff1e8] text-[#c2410c]' : 'bg-[#f2f2f1] text-[#111418]')}>
            <span className="block text-[1.42rem] font-extrabold leading-none tracking-[-0.04em] tabular-nums">{perDayLabel ? `~${perDayLabel}` : intro}</span>
            <span className="mt-1.5 block text-[0.6rem] font-extrabold leading-none tracking-[0.02em] opacity-75">{perDayLabel ? `/ ${copy.paywall.perDay}` : plan.billingLabel[activeLocale]}</span>
          </span>
        </span>
      </button>
    );
  };

  const checkoutButton = (
    <button type="button" disabled={!pricesReady || busy || checkoutUnavailable} onClick={requestCheckout} className={cn('min-h-14 w-full rounded-2xl px-5 text-base font-extrabold text-white shadow-[0_14px_28px_rgb(23_69_58_/_0.22)] transition focus:outline-none focus-visible:ring-4 focus-visible:ring-teal-brand/25 active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-50', exitOfferActive ? 'bg-[#C2410C] hover:bg-[#9A3412]' : 'cta-premium', (welcomeOfferActive || exitOfferActive) && !busy && 'cta-attention')}><span>{busy ? copy.paywall.loading : englishCta}</span></button>
  );

  const planTdee = tdee ?? computeTdeeResult(data);
  const claimWelcomeGift = () => {
    markWelcomeVoucherClaimed();
    const offer = createPaywallOffer('welcome', Date.now(), welcomeSeconds);
    storePaywallOffer(offer);
    setOfferKind('welcome');
    setOfferExpiresAt(offer.expiresAt);
    setSecondsLeft(welcomeSeconds);
    setGiftSkipped(true);
    window.scrollTo({ top: 0 });
  };
  // A short recap leads, so the price sits on the first screen: the goal with the day's calories and protein.
  // The day of meals and the first changes stay on the plan screen (25); without a weight goal the day stands in.
  const planTop = (
    <section className="pt-2">
      <h1 className="px-1 text-[2rem] font-extrabold leading-[1.08] tracking-[-0.035em] text-forest [text-wrap:balance]">{data.name?.trim() ? funnelPaywall.heroTitle(data.name.trim()) : funnelPaywall.heroFallback}</h1>
      {data.motivation && <p className="mt-2 px-1 text-[0.98rem] font-bold leading-snug text-teal-brand">{funnelPaywall.heroWhy[data.motivation]}</p>}
      {timeline ? (
        <GoalStrip data={data} system={system} targets={planTdee ? { calories: planTdee.calories, proteinG: planTdee.protein_g } : undefined} className="mt-4" />
      ) : (
        <>
          <p className="mt-3 px-1 text-[1.02rem] font-semibold leading-relaxed text-slate-brand">{funnelPaywall.heroSteady}</p>
          {planTdee ? <PlanDayCard data={data} tdee={planTdee} className="mt-2" /> : <PlanGoalCard data={data} tdee={planTdee} system={system} className="mt-4" />}
        </>
      )}
    </section>
  );
  // The guarantee as one row: badge beside the terms, so it reassures without another full card of text.
  const guaranteeRow = (title: string, body: string) => (
    <section className="flex items-center gap-4 rounded-[1.6rem] bg-white p-4 shadow-[0_18px_46px_rgb(23_69_58_/_0.08)]">
      <svg viewBox="0 0 64 64" className="h-16 w-16 shrink-0" aria-hidden="true">
        <path d="M32 4 54 12v18c0 14-9.5 24.5-22 30C19.5 54.5 10 44 10 30V12Z" fill="#17453a" />
        <path d="M32 9.5 49.5 16v14c0 11-7.3 19.6-17.5 24.4C21.8 49.6 14.5 41 14.5 30V16Z" fill="none" stroke="#34d0b4" strokeWidth="1.5" opacity="0.7" />
        <text x="32" y="33" textAnchor="middle" fill="#fff" fontSize="17" fontWeight="800">30</text>
        <text x="32" y="44" textAnchor="middle" fill="#bfeee2" fontSize="7.5" fontWeight="700">{copy.paywall.guaranteeBadgeUnit}</text>
      </svg>
      <div className="min-w-0">
        <h2 className="text-[1rem] font-extrabold leading-tight text-forest">{title}</h2>
        <p className="mt-1 text-[0.82rem] font-medium leading-relaxed text-muted-brand">{body}</p>
      </div>
    </section>
  );
  const priceStatus = offerRunning ? null : isExitOfferMode ? funnelPaywall.exitEnded : funnelPaywall.welcomeEnded;
  // minmax(0,1fr): a card whose content cannot shrink (the rating row's laurels and count) overflows itself,
  // instead of widening the shared column past the screen and clipping the right corners of every card.
  const englishBody = (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4 pt-[5.5rem]">
      {planTop}

      <section id="plans" ref={observePlans} className="scroll-mt-24 rounded-[1.6rem] bg-white p-4 shadow-[0_18px_46px_rgb(23_69_58_/_0.08)] sm:p-5">
        {/* While an offer runs, the fixed header shows its timer; once it ends, one line says prices are back to normal. */}
        {priceStatus && <p className="rounded-[1rem] bg-mist px-3 py-2.5 text-center text-[0.8rem] font-bold text-forest">{priceStatus}</p>}
        <div role="radiogroup" aria-label={copy.paywall.selectPlanAria} className={cn('grid gap-3', priceStatus && 'mt-3')}>
          {!plans.length && loadState === 'loading' && [0, 1, 2].map((index) => <div key={index} aria-hidden="true" className="min-h-[4.5rem] animate-pulse rounded-[1.2rem] border-2 border-border-brand bg-mist/40" />)}
          {plans.map((plan) => planCard(plan, planName(plan), plan.id === timelinePlan?.id ? funnelPaywall.fitsTimeline : null))}
        </div>
        <div className="mt-4">{checkoutButton}</div>
        <p className="mt-2.5 text-center text-[0.72rem] font-medium leading-relaxed text-muted-brand">{renewalLine}</p>
        <p className="mt-3 flex items-center justify-center gap-1 text-[0.7rem] font-bold text-muted-brand"><Icon name="lock" className="h-3.5 w-3.5" />{funnelPaywall.payWith}</p>
        <div className="mt-1.5 flex flex-wrap items-center justify-center gap-1.5">
          {checkoutWallets.includes('apple_pay') && <ApplePayBadge />}
          {checkoutWallets.includes('google_pay') && <GooglePayBadge />}
          <span className="inline-flex h-7 items-center rounded-md border border-border-brand bg-white px-2 text-[0.74rem] font-extrabold italic text-[#003087]">Pay<span className="text-[#009cde]">Pal</span></span>
          <span className="inline-flex h-7 items-center gap-1 rounded-md border border-border-brand bg-white px-2 text-[0.74rem] font-extrabold text-forest"><Icon name="card" className="h-3.5 w-3.5" />{funnelPaywall.card}</span>
        </div>
      </section>

      {guaranteeRow(funnelPaywall.guaranteeTitle, funnelPaywall.guaranteeBody)}

      <AppIncludesCard data={data} tdee={planTdee} system={system} />

      <TrustCard />

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
            <button type="button" disabled={!pricesReady || busy || checkoutUnavailable} onClick={onHeaderCta} className={cn('min-h-11 rounded-[1rem] px-3.5 text-[0.78rem] font-extrabold text-white shadow-[0_10px_24px_rgb(23_69_58_/_0.20)] transition focus:outline-none focus-visible:ring-4 focus-visible:ring-teal-brand/25 active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-50 sm:px-4 sm:text-[0.86rem]', exitOfferActive ? 'bg-[#C2410C] hover:bg-[#9A3412]' : 'bg-forest hover:bg-emerald-deep')}>{busy ? copy.paywall.loading : copy.paywall.topCta}</button>
          </div>
        </div>
      )}
      className="gap-5"
    >
      {/* On <body>, so the page's animated wrappers don't pin this fixed sheet to themselves. */}
      {inlineCheckout && checkoutSheetOpen && createPortal(checkoutSheet, document.body)}
      {giftOpen && <WelcomeGiftScreen name={data.name?.trim() || null} claim={welcomeClaim} ready={pricesReady} minutes={Math.round(welcomeSeconds / 60)} onClaim={claimWelcomeGift} />}
      {exitGiftOpen && exitClaim && (
        <WelcomeGiftScreen variant="exit" name={data.name?.trim() || null} claim={exitClaim} ready minutes={Math.round(PAYWALL_WELCOME_OFFER_SECONDS / 60)} onClaim={() => { setExitGiftOpen(false); window.scrollTo({ top: 0 }); }} />
      )}
      {plainPricing ? englishBody : (
      <div className="pt-[5.75rem]">
        {planTop}

        <section id="plans" ref={observePlans} className="mt-5 scroll-mt-24 rounded-[2rem] bg-white p-3.5 shadow-[0_18px_46px_rgb(23_69_58_/_0.08)] sm:mt-6 sm:p-5">
          <h2 className="text-center text-[1.08rem] font-extrabold tracking-[-0.02em] text-forest sm:text-[1.18rem]">{copy.paywall.planTitle}</h2>
          {!isOriginalPricing && <p className={cn('mt-4 rounded-[1.15rem] px-3 py-2.5 text-center text-[0.84rem] font-extrabold tabular-nums', exitOfferActive ? 'bg-[#FFF7ED] text-[#9A3412] ring-1 ring-[#FDBA74]' : 'bg-[#e8f4ef] text-forest')}>{timerLabel}</p>}
          <div role="radiogroup" aria-label={copy.paywall.selectPlanAria} className="mt-5 grid gap-3">
            {!plans.length && loadState === 'loading' && [0, 1, 2].map((index) => <div key={index} aria-hidden="true" className="min-h-[5.25rem] animate-pulse rounded-[1.4rem] border-2 border-[#dfe7e3] bg-[#f6f8f7]" />)}
            {plans.map((plan) => planCard(plan, plan.label[activeLocale], plan.recommended ? copy.paywall.recommendedTag : null))}
          </div>
          <p className="mt-3 text-center text-[0.7rem] font-semibold leading-snug text-muted-brand">{copy.paywall.perDayFootnote}</p>
          {paywall.recommendationNote?.[activeLocale] && <p className="mt-5 text-[0.94rem] leading-relaxed text-slate-brand">{paywall.recommendationNote[activeLocale]}</p>}
            <button type="button" disabled={!pricesReady || busy || checkoutUnavailable} onClick={requestCheckout} className="mt-5 min-h-14 w-full rounded-2xl bg-forest px-5 text-base font-extrabold text-white shadow-[0_14px_28px_rgb(23_69_58_/_0.22)] transition hover:bg-emerald-deep focus:outline-none focus-visible:ring-4 focus-visible:ring-teal-brand/25 active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-50">{busy ? copy.paywall.loading : copy.paywall.cta()}</button>
          <p className="mt-4 text-center text-sm leading-relaxed text-muted-brand">{priceSummary}</p>
        </section>

        <div className="mt-5 sm:mt-6">{guaranteeRow(copy.paywall.guaranteeTitle, copy.paywall.guaranteeBody)}</div>
        <AppIncludesCard data={data} tdee={planTdee} system={system} className="mt-5 sm:mt-6" />
        <TrustCard className="mt-5 sm:mt-6" />
        {statusNodes}
        <div className="mt-6 flex justify-center px-4"><BoCongThuongBadge alt={copy.common.bctBadgeAlt} /></div>
        <p className="mx-auto mt-3 max-w-[38rem] px-4 text-center text-xs font-medium leading-relaxed text-muted-brand">{copy.paywall.termsIntro} {copy.paywall.secure}</p>
      </div>
      )}
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
