import { deriveAge } from '../quiz/dob';
import { safeLeadProjection } from '../handoff/lead-projection';
import type { Lead, OnboardingPayload, TdeeResult } from '../quiz/types';

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
  const age = deriveAge(data);
  if (age == null) throw new Error('A valid birth date is required before previewing TDEE.');
  const body = {
    age,
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
  const result = await post<TdeeApiResponse>('/v1/tdee/preview', body);
  return {
    bmr: result.bmr,
    tdee: result.tdee,
    calories: result.macros.calories,
    protein_g: result.macros.protein_grams ?? result.macros.protein,
    carbs_g: result.macros.carbs_grams ?? result.macros.carbs,
    fat_g: result.macros.fat_grams ?? result.macros.fat,
  };
}

/** Creates a possession-bound lead through the same-origin BFF. */
export async function createLead(email: string, payload: OnboardingPayload): Promise<Lead> {
  if (!leadCreation) {
    const requestId = crypto.randomUUID();
    leadCreation = createLeadOnce(email, payload, requestId).finally(() => { leadCreation = null; });
  }
  return leadCreation;
}

let leadCreation: Promise<Lead> | null = null;

async function createLeadOnce(email: string, payload: OnboardingPayload, requestId: string): Promise<Lead> {
  await initializeLeadSession();
  const res = await fetch('/api/web-funnel/leads', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Request-ID': requestId },
    body: JSON.stringify({ email, payload: toWebFunnelSnapshot(payload) }),
  });
  if (!res.ok) {
    const response = await res.json().catch(() => null) as { detail?: unknown } | null;
    const detail = typeof response?.detail === 'string'
      ? response.detail
      : Array.isArray(response?.detail)
        ? JSON.stringify(response.detail)
        : `Could not save your checkout draft: ${res.status}`;
    throw new Error(detail);
  }
  return res.json() as Promise<Lead>;
}

/** Maps quiz field names to the backend's strict mobile onboarding contract. */
export function toWebFunnelSnapshot(data: OnboardingPayload) {
  return {
    birth_year: data.birth_year,
    birth_month: data.birth_month,
    birth_day: data.birth_day,
    gender: data.gender,
    height: data.height_cm,
    weight: data.weight_kg,
    ...(data.body_fat_percentage != null && { body_fat_percentage: data.body_fat_percentage }),
    job_type: data.job_type,
    training_days_per_week: data.training_days_per_week,
    training_minutes_per_session: data.training_minutes_per_session,
    goal: data.fitness_goal,
    pain_points: data.pain_points ?? [],
    dietary_preferences: data.dietary_preferences ?? [],
    target_weight_kg: data.target_weight_kg,
    ...(data.challenge_duration && { challenge_duration: data.challenge_duration }),
  };
}

export async function getLeadStatus(leadId: string): Promise<Lead> {
  const res = await fetch(`/api/web-funnel/leads/${encodeURIComponent(leadId)}/status`, { cache: 'no-store', credentials: 'same-origin' });
  if (!res.ok) throw new Error(`Could not load checkout status: ${res.status}`);
  return res.json() as Promise<Lead>;
}

/** Sends the anonymous provider ID and redemption-link digest to the same-origin BFF after checkout. */
export async function correlateRevenueCatCustomer(leadId: string, appUserId: string, redemptionLinkHash: string): Promise<Lead> {
  const res = await fetch(`/api/web-funnel/leads/${encodeURIComponent(leadId)}/revenuecat-correlation`, {
    method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ app_user_id: appUserId, redemption_link_hash: redemptionLinkHash }),
  });
  if (!res.ok) throw new Error(`Could not verify payment: ${res.status}`);
  const safe = safeLeadProjection(await res.json());
  if (!safe) throw new Error('Could not verify payment response.');
  return safe;
}

export async function requestLeadResend(leadId: string): Promise<void> {
  const res = await fetch(`/api/web-funnel/leads/${encodeURIComponent(leadId)}/resend`, { method: 'POST', credentials: 'same-origin' });
  if (!res.ok) throw new Error(`Could not request a new link: ${res.status}`);
}

export async function resetLeadSession(leadId: string): Promise<void> {
  const res = await fetch('/api/web-funnel/session/reset', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lead_id: leadId }) });
  if (!res.ok) throw new Error(`Could not reset checkout draft: ${res.status}`);
}

let sessionRequest: Promise<void> | null = null;

function initializeLeadSession(): Promise<void> {
  if (!sessionRequest) {
    sessionRequest = fetch('/api/web-funnel/session', { method: 'POST', credentials: 'same-origin' })
      .then((res) => { if (!res.ok) throw new Error('Could not establish checkout session.'); })
      .finally(() => { sessionRequest = null; });
  }
  return sessionRequest;
}
