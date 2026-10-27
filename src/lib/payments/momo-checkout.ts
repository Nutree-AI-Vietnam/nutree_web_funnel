/**
 * The backend's pass keys. The passes follow the card plans (1, 4 and 24 weeks); the 12 and 52-week
 * keys are the first catalog's, still accepted so the paywall works whichever catalog the API serves.
 */
export type MomoPlanKey = 'weekly' | 'monthly' | 'six_month' | 'quarterly' | 'yearly';
export type MomoOrderStatus = 'pending' | 'paid' | 'failed' | 'expired';
/** Ví MoMo (QR or app) or a domestic ATM card on MoMo's hosted page. */
export type MomoPayMethod = 'wallet' | 'atm';

/** What this buyer pays now; the backend decides intro vs regular price. */
export interface MomoPlanQuote {
  plan: MomoPlanKey;
  weeks: number;
  amount: number;
  regular_amount: number;
  intro: boolean;
}

export const MOMO_ORDER_ID = /^[0-9a-f]{32}$/;

/** Shown to shoppers whenever MoMo checkout fails for a reason they cannot fix. */
export const MOMO_UNAVAILABLE = 'MoMo is temporarily unavailable. Please try again later.';

/** Post-checkout for a confirmed MoMo order. The query param still says MoMo where the tab has no stored method. */
export const MOMO_POSTCHECKOUT_PATH = '/postcheckout?method=momo';

export function isMomoPostcheckout(search: string): boolean {
  return new URLSearchParams(search).get('method') === 'momo';
}

/** Per-order guard so a reloaded or second return page does not report the same purchase twice. */
const PURCHASE_REPORTED_KEY_PREFIX = 'nutree.momo.purchase-reported.v1.';

const PLAN_KEYS = new Set<MomoPlanKey>(['weekly', 'monthly', 'six_month', 'quarterly', 'yearly']);

export function momoPlanKey(planId: string): MomoPlanKey {
  if (!PLAN_KEYS.has(planId as MomoPlanKey)) throw new Error('Unknown MoMo plan');
  return planId as MomoPlanKey;
}

export function isMomoPayUrl(value: unknown): value is string {
  if (typeof value !== 'string' || !value.startsWith('https://')) return false;
  try {
    const host = new URL(value).hostname.toLowerCase();
    return host === 'momo.vn' || host.endsWith('.momo.vn');
  } catch {
    return false;
  }
}

/** MoMo returns `orderId`; older links used `order_id`. */
export function momoOrderIdFrom(params: { get(name: string): string | null }): string | null {
  const value = params.get('orderId') ?? params.get('order_id');
  return value && MOMO_ORDER_ID.test(value) ? value : null;
}

/** Backend messages are shopper-safe strings; anything structured (such as configuration details) is not shown. */
export function momoCheckoutFailureDetail(payload: unknown): string {
  const detail = payload && typeof payload === 'object' ? (payload as { detail?: unknown }).detail : undefined;
  return typeof detail === 'string' && detail.trim() ? detail : MOMO_UNAVAILABLE;
}

/**
 * True the first time this browser reports the order as purchased. Every tab
 * shares the lead cookie that reads the order, so the guard lives in
 * localStorage, not in one tab's session. The Purchase event id is also fixed
 * per order (see track.ts), so the ad platforms drop any repeat that gets past it.
 */
export function claimMomoPurchaseReport(orderId: string): boolean {
  try {
    const key = `${PURCHASE_REPORTED_KEY_PREFIX}${orderId}`;
    if (window.localStorage.getItem(key)) return false;
    window.localStorage.setItem(key, '1');
  } catch {
    // Without local storage the purchase is still reported; its fixed event id dedupes it.
  }
  return true;
}

export function formatMomoAmount(amount: number): string {
  return `${amount.toLocaleString('vi-VN')}đ`;
}

function isQuote(value: unknown): value is MomoPlanQuote {
  if (!value || typeof value !== 'object') return false;
  const quote = value as Partial<MomoPlanQuote>;
  return PLAN_KEYS.has(quote.plan as MomoPlanKey)
    && typeof quote.weeks === 'number'
    && typeof quote.amount === 'number'
    && typeof quote.regular_amount === 'number'
    && typeof quote.intro === 'boolean';
}

export async function fetchMomoPlans(leadId: string): Promise<MomoPlanQuote[]> {
  const response = await fetch(`/api/web-funnel/momo/plans?lead_id=${encodeURIComponent(leadId)}`, {
    cache: 'no-store',
    credentials: 'same-origin',
  });
  const payload = (await response.json().catch(() => null)) as { plans?: unknown } | null;
  const plans = Array.isArray(payload?.plans) ? payload.plans.filter(isQuote) : [];
  if (!response.ok || !plans.length) throw new Error('MoMo prices are unavailable.');
  return plans;
}

/**
 * Weeks a card plan covers as Nutree names it: a month is "4 tuần" and six months "24 tuần", so a
 * MoMo pass of the same length can pay for it.
 */
export function momoWeeksForPeriod(period: { number: number; unit: string } | null | undefined): number | null {
  if (!period || !(period.number > 0)) return null;
  const perUnit: Record<string, number> = { week: 1, month: 4, year: 52 };
  return perUnit[period.unit] ? period.number * perUnit[period.unit] : null;
}

/** The pass that pays for a card plan of this many weeks, if the API sells one. */
export function momoQuoteForWeeks(quotes: readonly MomoPlanQuote[], weeks: number | null): MomoPlanQuote | null {
  return weeks == null ? null : quotes.find((quote) => quote.weeks === weeks) ?? null;
}

/** A VND charge: a whole number of dong above zero. */
export function isMomoAmount(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
}

export interface MomoCheckoutStart {
  payUrl: string;
  orderId: string;
  /** VND the order charges, which can differ from an older quote. */
  amount: number;
}

export async function startMomoCheckout(
  plan: MomoPlanKey,
  method: MomoPayMethod,
  lang: 'vi' | 'en',
  leadId: string,
): Promise<MomoCheckoutStart> {
  const response = await fetch('/api/web-funnel/momo/checkouts', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ plan: momoPlanKey(plan), method, lang, lead_id: leadId }),
  });
  const payload = (await response.json().catch(() => null)) as { pay_url?: unknown; order_id?: unknown; amount?: unknown; detail?: unknown } | null;
  if (!response.ok || !isMomoPayUrl(payload?.pay_url) || typeof payload?.order_id !== 'string' || !isMomoAmount(payload?.amount)) {
    throw new Error(typeof payload?.detail === 'string' ? payload.detail : MOMO_UNAVAILABLE);
  }
  return { payUrl: payload.pay_url, orderId: payload.order_id, amount: payload.amount };
}

export interface MomoOrderStatusResult {
  status: MomoOrderStatus | null;
  httpStatus: number;
  plan: MomoPlanKey | null;
  /** VND charged for the order. */
  amount: number | null;
}

export async function fetchMomoOrderStatus(orderId: string): Promise<MomoOrderStatusResult> {
  const response = await fetch(`/api/web-funnel/momo/orders/${encodeURIComponent(orderId)}/status`, {
    cache: 'no-store',
    credentials: 'same-origin',
  });
  const payload = (await response.json().catch(() => null)) as { status?: unknown; plan?: unknown; amount?: unknown } | null;
  if (!response.ok) return { status: null, httpStatus: response.status, plan: null, amount: null };
  const status = ['pending', 'paid', 'failed', 'expired'].includes(String(payload?.status))
    ? (payload?.status as MomoOrderStatus)
    : null;
  const plan = PLAN_KEYS.has(payload?.plan as MomoPlanKey) ? (payload?.plan as MomoPlanKey) : null;
  const amount = isMomoAmount(payload?.amount) ? payload.amount : null;
  return { status, httpStatus: response.status, plan, amount };
}
