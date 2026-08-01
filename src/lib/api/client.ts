import type {
  CheckoutResponse,
  CheckoutStatusResponse,
  Currency,
  FunnelContext,
  FunnelOffer,
  Lead,
  MomoCheckout,
  OnboardingPayload,
  PaymentStatus,
  TdeeResult,
} from '../quiz/types';
import { createFallbackFunnelContext } from '../funnel/catalog';

const WELCOME_REWARD_CODE = 'WELCOME50';

function baseUrl(): string {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!base) throw new Error('NEXT_PUBLIC_API_BASE_URL is not set');
  return base;
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${baseUrl()}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`POST ${path} failed: ${res.status}`);
  return res.json() as Promise<T>;
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${baseUrl()}${path}`);
  if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`);
  return res.json() as Promise<T>;
}

/** Backend response for /v1/tdee/preview (see nutree_ai tdee_models.dart). */
interface TdeeApiResponse {
  bmr: number;
  tdee: number;
  goal: string;
  macros: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    protein_grams?: number;
    carbs_grams?: number;
    fat_grams?: number;
  };
}

/** Calls the existing unauthenticated TDEE preview endpoint. */
export async function previewTdee(data: OnboardingPayload): Promise<TdeeResult> {
  const body = {
    age: data.age,
    sex: data.gender,
    height: data.height_cm,
    weight: data.weight_kg,
    ...(data.body_fat_percentage != null && { body_fat_percentage: data.body_fat_percentage }),
    job_type: data.job_type,
    training_days_per_week: data.training_days_per_week,
    training_minutes_per_session: data.training_minutes_per_session,
    goal: data.fitness_goal,
    unit_system: 'metric',
  };
  const r = await post<TdeeApiResponse>('/v1/tdee/preview', body);
  return {
    bmr: r.bmr,
    tdee: r.tdee,
    calories: r.macros.calories,
    protein_g: r.macros.protein_grams ?? r.macros.protein,
    carbs_g: r.macros.carbs_grams ?? r.macros.carbs,
    fat_g: r.macros.fat_grams ?? r.macros.fat,
  };
}

function getBrowserCountry(): string {
  if (typeof window === 'undefined') return 'US';
  const language = window.navigator.language || '';
  return language.toLowerCase().endsWith('-vn') ? 'VN' : 'US';
}

/** Creates a pre-authentication funnel lead and persists its quiz answers. */
export async function createLead(email: string, onboardingPayload: OnboardingPayload): Promise<Lead> {
  const response = await post<{
    lead_id: string;
    masked_email?: string;
  }>('/v1/web-funnel/leads', {
    email,
    onboarding_payload: onboardingPayload,
    source: 'nutree_web_funnel',
  });
  return {
    email,
    lead_id: response.lead_id,
    masked_email: response.masked_email,
  };
}

export async function getFunnelContext(): Promise<FunnelContext> {
  return createFallbackFunnelContext(getBrowserCountry());
}

export async function revealWelcomeReward(sessionId: string, leadId: string): Promise<FunnelContext> {
  void sessionId;
  void leadId;
  return createFallbackFunnelContext(getBrowserCountry());
}

export async function createCheckout({
  leadId,
  offer,
  billingCountry,
}: {
  leadId: string;
  offer: FunnelOffer;
  billingCountry: string;
}): Promise<CheckoutResponse> {
  const response = await post<{
    checkoutId: string;
    status: CheckoutResponse['status'];
    provider: 'paypal';
    planId: string;
    customId: string;
    offerId: string;
    rewardId: string;
    currency: Currency;
    amountMinor: number;
    standardAmountMinor: number;
    renewalAmountMinor: number;
    renewalDescription: string;
    renewalInterval: string;
    welcomeDiscountPercent: number;
  }>('/v1/web-funnel/checkouts', {
    lead_id: leadId,
    offer_id: offer.id,
    reward_id: WELCOME_REWARD_CODE,
    billing_country: billingCountry,
    idempotency_key: crypto.randomUUID(),
  });
  const amountDueToday =
    response.currency === 'USD' ? response.amountMinor / 100 : response.amountMinor;
  const standardAmount =
    response.currency === 'USD' ? response.standardAmountMinor / 100 : response.standardAmountMinor;
  const renewalAmount =
    response.currency === 'USD' ? response.renewalAmountMinor / 100 : response.renewalAmountMinor;
  return {
    checkoutId: response.checkoutId,
    provider: 'PAYPAL',
    countryCode: billingCountry,
    currency: response.currency,
    offerId: response.offerId,
    rewardId: response.rewardId,
    rewardApplied: true,
    discountPercent: response.welcomeDiscountPercent as 50,
    standardAmount,
    amountDueToday,
    renewalAmount,
    renewalDescription: response.renewalDescription,
    nextBillingDate: offer.next_billing_date,
    priceLockedWhileActive: true,
    status: response.status,
    paypal: {
      planId: response.planId,
      customId: response.customId,
    },
  };
}

export async function confirmPayPalSubscription(
  checkoutId: string,
  subscriptionId: string,
): Promise<CheckoutStatusResponse> {
  return post<CheckoutStatusResponse>(`/v1/web-funnel/checkouts/${checkoutId}/paypal-confirmation`, {
    subscriptionId,
  });
}

export async function getCheckoutStatus(checkoutId: string): Promise<CheckoutStatusResponse> {
  return get<CheckoutStatusResponse>(`/v1/web-funnel/checkouts/${checkoutId}`);
}

export async function createMomoSubscriptionCheckout(
  webUserId: string,
  planId = 'monthly',
): Promise<MomoCheckout> {
  return post<MomoCheckout>('/v1/web-funnel/momo/subscription-checkouts', {
    web_user_id: webUserId,
    plan_id: planId,
  });
}

export async function getPaymentStatus(orderId: string): Promise<PaymentStatus> {
  const res = await fetch(`${baseUrl()}/v1/web-funnel/payment-orders/${orderId}/status`);
  if (!res.ok) throw new Error(`GET payment status failed: ${res.status}`);
  return res.json() as Promise<PaymentStatus>;
}
