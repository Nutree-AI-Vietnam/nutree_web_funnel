import { describe, expect, it } from 'vitest';
import { toWebFunnelSnapshot } from '@/lib/api/client';
import type { OnboardingPayload } from '@/lib/quiz/types';
import { answersFromSnapshot, readPlanLinkFragment } from './plan-link';

describe('plan links', () => {
  it('reads the token and the start flag from the fragment only', () => {
    expect(readPlanLinkFragment(`#t=${'a'.repeat(40)}&start=1`)).toEqual({ token: 'a'.repeat(40), start: true });
    expect(readPlanLinkFragment(`#t=${'a'.repeat(40)}`)).toEqual({ token: 'a'.repeat(40), start: false });
    expect(readPlanLinkFragment('#t=short')).toBeNull();
    expect(readPlanLinkFragment('')).toBeNull();
  });

  it('restores the answers the snapshot carries', () => {
    const data: OnboardingPayload = {
      measurement_unit: 'metric',
      birth_year: 1992,
      birth_month: 1,
      birth_day: 1,
      gender: 'female',
      height_cm: 167.6,
      weight_kg: 81.6,
      target_weight_kg: 70.3,
      job_type: 'desk',
      training_days_per_week: 3,
      training_minutes_per_session: 45,
      fitness_goal: 'cut',
      pain_points: ['no_time'],
      dietary_preferences: ['vegan'],
      challenge_duration: 'few_months',
    };
    expect(answersFromSnapshot(toWebFunnelSnapshot(data) as Record<string, unknown>)).toEqual(data);
  });
});
