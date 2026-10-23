import type { Lead, OnboardingPayload } from '@/lib/quiz/types';

/** Set by a plan link with start=1; the paywall opens checkout once, as soon as prices load. */
export const PAYWALL_AUTOSTART_KEY = 'nutree.paywall.autostart.v1';

export interface PlanLinkFragment {
  token: string;
  start: boolean;
}

export function readPlanLinkFragment(hash: string): PlanLinkFragment | null {
  const params = new URLSearchParams(hash.replace(/^#/, ''));
  const token = params.get('t');
  return token && token.length >= 32 ? { token, start: params.get('start') === '1' } : null;
}

export interface RedeemedPlan {
  lead: Lead;
  email: string | null;
  snapshot: Record<string, unknown> | null;
  locale: 'vi' | 'en' | null;
  units: 'metric' | 'imperial' | null;
}

const num = (value: unknown) => (typeof value === 'number' && Number.isFinite(value) ? value : undefined);
const strings = (value: unknown) => (Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : undefined);

/** Quiz answers back from the backend's onboarding snapshot (the inverse of toWebFunnelSnapshot). */
export function answersFromSnapshot(snapshot: Record<string, unknown>): OnboardingPayload {
  const goal = snapshot.goal;
  const gender = snapshot.gender;
  const jobType = snapshot.job_type;
  return {
    measurement_unit: 'metric',
    birth_year: num(snapshot.birth_year),
    birth_month: num(snapshot.birth_month),
    birth_day: num(snapshot.birth_day),
    gender: gender === 'male' || gender === 'female' ? gender : undefined,
    height_cm: num(snapshot.height),
    weight_kg: num(snapshot.weight),
    target_weight_kg: num(snapshot.target_weight_kg),
    job_type: jobType === 'desk' || jobType === 'on_feet' || jobType === 'physical' ? jobType : undefined,
    training_days_per_week: num(snapshot.training_days_per_week),
    training_minutes_per_session: num(snapshot.training_minutes_per_session),
    fitness_goal: goal === 'cut' || goal === 'bulk' || goal === 'recomp' || goal === 'maintain' ? goal : undefined,
    pain_points: strings(snapshot.pain_points),
    dietary_preferences: strings(snapshot.dietary_preferences),
    ...(typeof snapshot.challenge_duration === 'string' ? { challenge_duration: snapshot.challenge_duration } : {}),
  };
}

export async function redeemPlanLink(token: string): Promise<RedeemedPlan> {
  const res = await fetch('/api/web-funnel/plan-links/redeem', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  });
  if (!res.ok) throw new Error(`Plan link unavailable: ${res.status}`);
  return res.json() as Promise<RedeemedPlan>;
}
