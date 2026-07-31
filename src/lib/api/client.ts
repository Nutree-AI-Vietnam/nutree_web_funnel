import type {
  CheckoutResponse,
  FunnelContext,
  FunnelOffer,
  Lead,
  MomoCheckout,
  OnboardingPayload,
  PaymentStatus,
  TdeeResult,
} from '../quiz/types';
import type { FirebaseIdentity } from '../firebase/client';

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

/** Sync a Firebase-authenticated Google identity before starting Paddle checkout. */
export async function createLeadFromFirebase(identity: FirebaseIdentity): Promise<Lead> {
  const res = await fetch(`${baseUrl()}/v1/users/sync`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${identity.idToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      firebase_uid: identity.uid,
      email: identity.email,
      display_name: identity.displayName,
      photo_url: identity.photoUrl,
      provider: 'google',
    }),
  });
  if (!res.ok) throw new Error(`POST /v1/users/sync failed: ${res.status}`);

  return {
    email: identity.email,
    lead_id: identity.uid,
    web_user_id: identity.uid,
    masked_email: identity.email.replace(/^(.{2}).*(@.*)$/, '$1***$2'),
  };
}

export async function getFunnelContext(): Promise<FunnelContext> {
  return get<FunnelContext>('/api/funnel/context');
}

export async function revealWelcomeReward(sessionId: string, leadId: string): Promise<FunnelContext> {
  return post<FunnelContext>(`/v1/web-funnel/sessions/${sessionId}/welcome-reward/reveal`, {
    lead_id: leadId,
  });
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
  return post<CheckoutResponse>('/v1/web-funnel/checkouts', {
    lead_id: leadId,
    offer_id: offer.id,
    reward_id: offer.reward_id,
    billing_country: billingCountry,
    idempotency_key: crypto.randomUUID(),
  });
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
