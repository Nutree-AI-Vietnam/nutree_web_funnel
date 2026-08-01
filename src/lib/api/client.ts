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

/** Holds the email only in funnel state until RevenueCat checkout asks for it. */
export function captureEmail(email: string): Lead {
  return { email };
}
