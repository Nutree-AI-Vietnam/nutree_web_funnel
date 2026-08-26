import { Purchases, type Package, type Price } from '@revenuecat/purchases-js';
import { isOneWeekPlanEnabled, isRevenueCatPaywallPlanId, type RevenueCatPaywallPlanId } from './paywall-plans';

type PublicEnvironment = Record<string, string | undefined>;

export interface RevenueCatPlan {
  id: RevenueCatPaywallPlanId;
  packageIdentifier: string;
}

export interface RevenueCatWebConfig {
  apiKey: string;
  offeringIdentifier: string;
  plans: RevenueCatPlan[];
}

export const WELCOME_DISCOUNT_CODE = 'WELCOME50';
export const WELCOME_DISCOUNT_PERCENT = 50;
export const EXIT_DISCOUNT_CODE = 'EXIT75';
export const EXIT_DISCOUNT_PERCENT = 75;
export const PAYWALL_OFFER_STATE_STORAGE_KEY = 'nutree.paywall.offer-state.v1';
export const PAYWALL_EXIT_OFFER_CLAIMED_STORAGE_KEY = 'nutree.paywall.exit-offer-claimed.v1';
export const PAYWALL_EXIT_OFFER_CLAIMED_COOKIE = 'nutree_paywall_exit_offer_claimed';
export const PAYWALL_SELECTED_PLAN_STORAGE_KEY = 'nutree.paywall.selected-plan.v1';
export const PAYWALL_CHECKOUT_PENDING_STORAGE_KEY = 'nutree.paywall.checkout-pending.v1';
export const PAYWALL_EXIT_OFFER_SECONDS = 120;

function readSessionValue(key: string) {
  if (typeof window === 'undefined') return null;
  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeSessionValue(key: string, value: string) {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(key, value);
  } catch {
    // Ignore unavailable session storage; the current page remains usable.
  }
}

function readSessionCookie() {
  if (typeof document === 'undefined') return null;
  return document.cookie.split('; ').find((entry) => entry.startsWith(`${PAYWALL_EXIT_OFFER_CLAIMED_COOKIE}=`))?.split('=')[1] ?? null;
}

export function hasExitOfferBeenClaimed() {
  return readSessionValue(PAYWALL_EXIT_OFFER_CLAIMED_STORAGE_KEY) === '1' || readSessionCookie() === '1';
}

export function markExitOfferClaimed() {
  writeSessionValue(PAYWALL_EXIT_OFFER_CLAIMED_STORAGE_KEY, '1');
  if (typeof document !== 'undefined') {
    const secure = window.location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = `${PAYWALL_EXIT_OFFER_CLAIMED_COOKIE}=1; Path=/; SameSite=Lax${secure}`;
  }
}

export function activatePaywallExitOffer() {
  writeSessionValue(PAYWALL_OFFER_STATE_STORAGE_KEY, JSON.stringify({ kind: 'exit', expiresAt: Date.now() + PAYWALL_EXIT_OFFER_SECONDS * 1000 }));
}

/** Marks the current offer as expired without allowing a fresh welcome offer. */
export function expirePaywallOfferState(kind: 'welcome' | 'exit' = 'exit') {
  writeSessionValue(PAYWALL_OFFER_STATE_STORAGE_KEY, JSON.stringify({ kind, expiresAt: Date.now() }));
}

export function saveSelectedPaywallPlan(planId: RevenueCatPaywallPlanId) {
  writeSessionValue(PAYWALL_SELECTED_PLAN_STORAGE_KEY, planId);
}

export function markPaywallCheckoutPending() {
  writeSessionValue(PAYWALL_CHECKOUT_PENDING_STORAGE_KEY, '1');
}

export function hasPaywallCheckoutPending() {
  return readSessionValue(PAYWALL_CHECKOUT_PENDING_STORAGE_KEY) === '1';
}

export function clearPaywallCheckoutPending() {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(PAYWALL_CHECKOUT_PENDING_STORAGE_KEY);
  } catch {
    // Ignore unavailable session storage; the current checkout flow remains usable.
  }
}

export function readSelectedPaywallPlan(): RevenueCatPaywallPlanId | null {
  const value = readSessionValue(PAYWALL_SELECTED_PLAN_STORAGE_KEY);
  return value && isRevenueCatPaywallPlanId(value) ? value : null;
}

export function clearPaywallOfferState() {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(PAYWALL_OFFER_STATE_STORAGE_KEY);
  } catch {
    // Ignore unavailable session storage; the next paywall visit starts fresh.
  }
}

export function discountedFormattedPrice(price: Price | null | undefined, locale: string, percent = WELCOME_DISCOUNT_PERCENT): string | null {
  if (!price || !Number.isFinite(price.amountMicros) || percent < 0 || percent > 100) return null;
  const currency = /^[A-Z]{3}$/.test(price.currency) ? price.currency : null;
  if (!currency) return null;
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format((price.amountMicros / 1_000_000) * (1 - percent / 100));
}

function publicEnvironment(): PublicEnvironment {
  return {
    NEXT_PUBLIC_REVENUECAT_WEB_API_KEY: process.env.NEXT_PUBLIC_REVENUECAT_WEB_API_KEY,
    NEXT_PUBLIC_REVENUECAT_WEB_OFFERING_ID: process.env.NEXT_PUBLIC_REVENUECAT_WEB_OFFERING_ID,
    NEXT_PUBLIC_REVENUECAT_WEB_1_WEEK_ENABLED: process.env.NEXT_PUBLIC_REVENUECAT_WEB_1_WEEK_ENABLED,
    NEXT_PUBLIC_REVENUECAT_WEB_PACKAGE_1_WEEK: process.env.NEXT_PUBLIC_REVENUECAT_WEB_PACKAGE_1_WEEK,
    NEXT_PUBLIC_REVENUECAT_WEB_PACKAGE_4_WEEK: process.env.NEXT_PUBLIC_REVENUECAT_WEB_PACKAGE_4_WEEK,
    NEXT_PUBLIC_REVENUECAT_WEB_PACKAGE_12_WEEK: process.env.NEXT_PUBLIC_REVENUECAT_WEB_PACKAGE_12_WEEK,
    NEXT_PUBLIC_REVENUECAT_WEB_PACKAGE_52_WEEK: process.env.NEXT_PUBLIC_REVENUECAT_WEB_PACKAGE_52_WEEK,
  };
}

function required(source: PublicEnvironment, key: keyof PublicEnvironment): string {
  const value = source[key]?.trim();
  if (!value) throw new Error(`${key} is required before opening RevenueCat checkout.`);
  return value;
}

/** Reads browser-safe RevenueCat Web configuration. Paddle credentials stay in RevenueCat. */
export function readRevenueCatWebConfig(source?: PublicEnvironment, oneWeekEnabled?: boolean): RevenueCatWebConfig {
  const environment = source ?? publicEnvironment();
  const finalPlan = (oneWeekEnabled ?? isOneWeekPlanEnabled(environment))
    ? { id: '1-week' as const, packageIdentifier: required(environment, 'NEXT_PUBLIC_REVENUECAT_WEB_PACKAGE_1_WEEK') }
    : { id: '52-week' as const, packageIdentifier: required(environment, 'NEXT_PUBLIC_REVENUECAT_WEB_PACKAGE_52_WEEK') };

  return {
    apiKey: required(environment, 'NEXT_PUBLIC_REVENUECAT_WEB_API_KEY'),
    offeringIdentifier: required(environment, 'NEXT_PUBLIC_REVENUECAT_WEB_OFFERING_ID'),
    plans: [
      finalPlan,
      { id: '4-week', packageIdentifier: required(environment, 'NEXT_PUBLIC_REVENUECAT_WEB_PACKAGE_4_WEEK') },
      { id: '12-week', packageIdentifier: required(environment, 'NEXT_PUBLIC_REVENUECAT_WEB_PACKAGE_12_WEEK') },
    ],
  };
}

/** Configure one generated anonymous customer; backend later verifies and binds it to the lead. */
export function configureRevenueCatForAnonymousCheckout(config: RevenueCatWebConfig) {
  const appUserId = Purchases.generateRevenueCatAnonymousAppUserId();
  return { appUserId, purchases: Purchases.configure({ apiKey: config.apiKey, appUserId }) };
}

export function packagesByPlan(packages: Package[], plans: RevenueCatPlan[]): Record<RevenueCatPlan['id'], Package> {
  return Object.fromEntries(
    plans.flatMap((plan) => {
      const rcPackage = packages.find((candidate) => candidate.identifier === plan.packageIdentifier);
      return rcPackage ? [[plan.id, rcPackage]] : [];
    }),
  ) as Record<RevenueCatPlan['id'], Package>;
}
