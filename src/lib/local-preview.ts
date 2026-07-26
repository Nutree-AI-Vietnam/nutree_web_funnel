'use client';

import { useSyncExternalStore } from 'react';
import type { Lead, OnboardingPayload, TdeeResult } from '@/lib/quiz/types';

export function isLocalPreviewHost() {
  if (typeof window === 'undefined') return false;
  return ['localhost', '127.0.0.1', '0.0.0.0'].includes(window.location.hostname);
}

export function useLocalPreviewHost() {
  return useSyncExternalStore(
    () => () => {},
    isLocalPreviewHost,
    () => false,
  );
}

export const localPreviewLead: Lead = {
  email: 'local-preview@nutree.dev',
  lead_id: 'lead_local_preview',
  web_user_id: 'web_local_preview',
  masked_email: 'local-preview@nutree.dev',
  claim_token: 'claim_local_preview',
};

export const localPreviewData: OnboardingPayload = {
  measurement_unit: 'metric',
  name: 'Alex',
  fitness_goal: 'cut',
  target_weight_kg: 54,
  weight_kg: 68,
  height_cm: 170,
  age: 30,
  gender: 'male',
  training_days_per_week: 3,
  training_minutes_per_session: 45,
  job_type: 'desk',
};

export const localPreviewTdee: TdeeResult = {
  bmr: 1580,
  tdee: 2446,
  calories: 1946,
  protein_g: 135,
  carbs_g: 210,
  fat_g: 65,
};
