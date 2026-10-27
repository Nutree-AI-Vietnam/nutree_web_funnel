import type { OnboardingPayload } from './types';

/** The step goal picker's range and increment. */
export const STEP_GOAL = { min: 2000, max: 20000, step: 500 } as const;

/**
 * A daily step goal inside the app's recommended 6,000–10,000 range: more for jobs that already
 * keep you moving, a little less from age 60.
 */
export function recommendedStepGoal(data: Pick<OnboardingPayload, 'job_type' | 'age'>): number {
  const byJob = data.job_type === 'physical' ? 10000 : data.job_type === 'on_feet' ? 9000 : 8000;
  const adjusted = data.age != null && data.age >= 60 ? byJob - 1000 : byJob;
  return Math.min(10000, Math.max(6000, adjusted));
}
