export type MomoPlanKey = 'monthly' | 'quarterly' | 'yearly';
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

export interface MomoPlanCopy {
  label: { vi: string; en: string };
  description: { vi: string; en: string };
  recommended: boolean;
}

export const MOMO_PLAN_COPY: Record<MomoPlanKey, MomoPlanCopy> = {
  monthly: {
    label: { vi: '4 tuần', en: '4 weeks' },
    description: { vi: 'Thử trọn 4 tuần', en: 'Try a full 4 weeks' },
    recommended: false,
  },
  quarterly: {
    label: { vi: '12 tuần', en: '12 weeks' },
    description: { vi: 'Đủ 12 tuần để tạo nhịp theo dõi', en: 'A full 12-week rhythm' },
    recommended: true,
  },
  yearly: {
    label: { vi: '52 tuần', en: '52 weeks' },
    description: { vi: 'Theo dõi trọn 52 tuần', en: '52 weeks of consistency' },
    recommended: false,
  },
};

/** Shown until the backend quote arrives. Prices mirror backend momo_pass.py. */
export const DEFAULT_MOMO_PLANS: MomoPlanQuote[] = [
  { plan: 'monthly', weeks: 4, amount: 99_000, regular_amount: 198_000, intro: true },
  { plan: 'quarterly', weeks: 12, amount: 249_000, regular_amount: 498_000, intro: true },
  { plan: 'yearly', weeks: 52, amount: 599_000, regular_amount: 1_198_000, intro: true },
];

export const MOMO_ORDER_ID = /^[0-9a-f]{32}$/;

const PLAN_KEYS = new Set<MomoPlanKey>(['monthly', 'quarterly', 'yearly']);

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

export function momoCheckoutFailureDetail(payload: unknown): string {
  if (!payload || typeof payload !== 'object') return 'MoMo checkout is unavailable.';
  const detail = (payload as { detail?: unknown }).detail;
  if (typeof detail === 'string' && detail.trim()) return detail;
  const missing = detail && typeof detail === 'object' && !Array.isArray(detail)
    ? (detail as { missing?: unknown }).missing
    : undefined;
  if (!Array.isArray(missing)) return 'MoMo checkout is unavailable.';
  const names = missing.filter((item): item is string => typeof item === 'string' && item.startsWith('MOMO_'));
  return names.length ? `MoMo is not configured. Add ${names.join(', ')}.` : 'MoMo checkout is unavailable.';
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
  if (!response.ok || plans.length !== DEFAULT_MOMO_PLANS.length) throw new Error('MoMo prices are unavailable.');
  return plans;
}

export async function startMomoCheckout(
  plan: MomoPlanKey,
  method: MomoPayMethod,
  lang: 'vi' | 'en',
  leadId: string,
): Promise<{ payUrl: string; orderId: string }> {
  const response = await fetch('/api/web-funnel/momo/checkouts', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ plan: momoPlanKey(plan), method, lang, lead_id: leadId }),
  });
  const payload = (await response.json().catch(() => null)) as { pay_url?: unknown; order_id?: unknown; detail?: unknown } | null;
  if (!response.ok || !isMomoPayUrl(payload?.pay_url) || typeof payload?.order_id !== 'string') {
    throw new Error(typeof payload?.detail === 'string' ? payload.detail : 'MoMo checkout is unavailable.');
  }
  return { payUrl: payload.pay_url, orderId: payload.order_id };
}

export async function fetchMomoOrderStatus(orderId: string): Promise<{ status: MomoOrderStatus | null; httpStatus: number }> {
  const response = await fetch(`/api/web-funnel/momo/orders/${encodeURIComponent(orderId)}/status`, {
    cache: 'no-store',
    credentials: 'same-origin',
  });
  const payload = (await response.json().catch(() => null)) as { status?: unknown } | null;
  const status = ['pending', 'paid', 'failed', 'expired'].includes(String(payload?.status))
    ? (payload?.status as MomoOrderStatus)
    : null;
  return { status: response.ok ? status : null, httpStatus: response.status };
}
