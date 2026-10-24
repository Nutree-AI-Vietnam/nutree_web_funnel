import { Purchases } from '@revenuecat/purchases-js';

type PublicEnvironment = Record<string, string | undefined>;

export interface RevenueCatWebConfig {
  apiKey: string;
  offeringIdentifier: string;
}

/** Advertised offer percentages; checkout prices come from the discounted RevenueCat packages. */
export const WELCOME_DISCOUNT_PERCENT = 50;
export const EXIT_DISCOUNT_PERCENT = 75;
export const PAYWALL_OFFER_STATE_STORAGE_KEY = 'nutree.paywall.offer-state.v1';
export const PAYWALL_EXIT_OFFER_CLAIMED_STORAGE_KEY = 'nutree.paywall.exit-offer-claimed.v1';
export const PAYWALL_EXIT_OFFER_CLAIMED_COOKIE = 'nutree_paywall_exit_offer_claimed';
export const PAYWALL_SELECTED_PLAN_STORAGE_KEY = 'nutree.paywall.selected-plan.v1';
export const PAYWALL_CHECKOUT_PENDING_STORAGE_KEY = 'nutree.paywall.checkout-pending.v1';
export const PAYWALL_WELCOME_OFFER_SECONDS = 300;
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
    NEXT_PUBLIC_REVENUECAT_WEB_OFFERING_ID_INTL: process.env.NEXT_PUBLIC_REVENUECAT_WEB_OFFERING_ID_INTL,
    NEXT_PUBLIC_REVENUECAT_WEB_OFFERING_ID_INTL_TEST: process.env.NEXT_PUBLIC_REVENUECAT_WEB_OFFERING_ID_INTL_TEST,
  };
}

export type PriceTestVariant = 'control' | 'test';
const PRICE_TEST_BUCKET_KEY = 'nutree.price-test.bucket.v1';

/**
 * The price-test arm for non-Vietnam visitors, kept per browser so a returning
 * visitor sees the same prices. Null when no test offering is configured.
 */
export function priceTestVariant(source: PublicEnvironment = publicEnvironment(), random = Math.random): PriceTestVariant | null {
  if (!source.NEXT_PUBLIC_REVENUECAT_WEB_OFFERING_ID_INTL_TEST?.trim()) return null;
  try {
    const stored = window.localStorage.getItem(PRICE_TEST_BUCKET_KEY);
    if (stored === 'control' || stored === 'test') return stored;
    const assigned: PriceTestVariant = random() < 0.5 ? 'control' : 'test';
    window.localStorage.setItem(PRICE_TEST_BUCKET_KEY, assigned);
    return assigned;
  } catch {
    return 'control';
  }
}

function required(source: PublicEnvironment, key: keyof PublicEnvironment): string {
  const value = source[key]?.trim();
  if (!value) throw new Error(`${key} is required before opening RevenueCat checkout.`);
  return value;
}

/** Reads browser-safe RevenueCat Web configuration. Paddle credentials stay in RevenueCat. */
export function readRevenueCatWebConfig(source?: PublicEnvironment, countryCode: string = 'VN'): RevenueCatWebConfig {
  const environment = source ?? publicEnvironment();
  const vietnam = countryCode.toUpperCase() === 'VN';
  // The test offering (intro price, higher ladder or $1 first week) replaces the
  // international one for the test arm only.
  const offeringKey = vietnam
    ? 'NEXT_PUBLIC_REVENUECAT_WEB_OFFERING_ID'
    : priceTestVariant(environment) === 'test'
      ? 'NEXT_PUBLIC_REVENUECAT_WEB_OFFERING_ID_INTL_TEST'
      : 'NEXT_PUBLIC_REVENUECAT_WEB_OFFERING_ID_INTL';
  return {
    apiKey: required(environment, 'NEXT_PUBLIC_REVENUECAT_WEB_API_KEY'),
    offeringIdentifier: required(environment, offeringKey),
  };
}

/**
 * True once Paddle's checkout frame is on the page. RevenueCat's in-page container does not count:
 * it appears before Paddle loads, so a failed start would otherwise look like an abandoned checkout.
 */
export function paddleCheckoutIsOpen(root: ParentNode | null | undefined): boolean {
  return Boolean(
    root?.querySelector(
      '#paddle-checkout-container, iframe[src*="paddle.com"], iframe[name*="paddle" i], iframe[class*="paddle" i]',
    ),
  );
}

function messageRecord(data: unknown): Record<string, unknown> | null {
  if (typeof data === 'string') {
    try {
      return messageRecord(JSON.parse(data) as unknown);
    } catch {
      return null;
    }
  }
  return typeof data === 'object' && data !== null && !Array.isArray(data) ? (data as Record<string, unknown>) : null;
}

function paddleEventName(data: unknown): string | null {
  const message = messageRecord(data);
  if (!message) return null;
  const name = [message.name, message.event, message.event_name, message.type].find((value) => typeof value === 'string');
  return typeof name === 'string' ? name : null;
}

/** Paddle tells the page the checkout closed. A completed payment is not an abandoned checkout. */
export function paddleCheckoutClosedWithoutPayment(data: unknown): boolean {
  const name = paddleEventName(data);
  if (!name?.includes('checkout.closed')) return false;
  const message = messageRecord(data);
  const payload = messageRecord(message?.data) ?? messageRecord(message?.callback_data) ?? message;
  return payload?.status !== 'completed';
}

export function paddleCheckoutCompleted(data: unknown): boolean {
  return paddleEventName(data)?.includes('checkout.completed') ?? false;
}

/** Removes RevenueCat's checkout layer so the updated price page is visible. */
export function dismissCheckoutOverlay(root: ParentNode | null | undefined): void {
  root?.querySelectorAll('.rcb-ui-root').forEach((node) => node.remove());
}

/** Configure one generated anonymous customer; backend later verifies and binds it to the lead. */
export function configureRevenueCatForAnonymousCheckout(config: RevenueCatWebConfig) {
  const appUserId = Purchases.generateRevenueCatAnonymousAppUserId();
  return { appUserId, purchases: Purchases.configure({ apiKey: config.apiKey, appUserId }) };
}
