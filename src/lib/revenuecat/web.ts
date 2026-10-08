import { Purchases } from '@revenuecat/purchases-js';

type PublicEnvironment = Record<string, string | undefined>;

export interface RevenueCatWebConfig {
  apiKey: string;
  offeringIdentifier: string;
}

/** Shown in exit-offer headlines; checkout prices come from the discounted RevenueCat packages. */
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

export function saveSelectedPaywallPlan(planId: string) {
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

export function readSelectedPaywallPlan(): string | null {
  return readSessionValue(PAYWALL_SELECTED_PLAN_STORAGE_KEY)?.trim() || null;
}

export function clearPaywallOfferState() {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(PAYWALL_OFFER_STATE_STORAGE_KEY);
  } catch {
    // Ignore unavailable session storage; the next paywall visit starts fresh.
  }
}

function publicEnvironment(): PublicEnvironment {
  return {
    NEXT_PUBLIC_REVENUECAT_WEB_API_KEY: process.env.NEXT_PUBLIC_REVENUECAT_WEB_API_KEY,
    NEXT_PUBLIC_REVENUECAT_WEB_OFFERING_ID: process.env.NEXT_PUBLIC_REVENUECAT_WEB_OFFERING_ID,
  };
}

function required(source: PublicEnvironment, key: keyof PublicEnvironment): string {
  const value = source[key]?.trim();
  if (!value) throw new Error(`${key} is required before opening RevenueCat checkout.`);
  return value;
}

/** Reads browser-safe RevenueCat Web configuration. Paddle credentials stay in RevenueCat. */
export function readRevenueCatWebConfig(source?: PublicEnvironment): RevenueCatWebConfig {
  const environment = source ?? publicEnvironment();
  return {
    apiKey: required(environment, 'NEXT_PUBLIC_REVENUECAT_WEB_API_KEY'),
    offeringIdentifier: required(environment, 'NEXT_PUBLIC_REVENUECAT_WEB_OFFERING_ID'),
  };
}

/** Configure one generated anonymous customer; backend later verifies and binds it to the lead. */
export function configureRevenueCatForAnonymousCheckout(config: RevenueCatWebConfig) {
  const appUserId = Purchases.generateRevenueCatAnonymousAppUserId();
  return { appUserId, purchases: Purchases.configure({ apiKey: config.apiKey, appUserId }) };
}