import type { QuizStep } from './steps';
import type { OnboardingPayload } from './types';

/**
 * The live onboarding contract accepts 0 days with 0 minutes, and 1–7 days
 * with a session of 15–180 minutes. Anything else is rejected.
 */
const MIN_SESSION_MINUTES = 15;
const MAX_SESSION_MINUTES = 180;

function wholeNumber(value: number | undefined, min: number, max: number): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max;
}

/** A training pair the backend will store. Missing or invalid answers are 0 days and 0 minutes. */
export function trainingPair(
  data: Pick<OnboardingPayload, 'training_days_per_week' | 'training_minutes_per_session'>,
): { training_days_per_week: number; training_minutes_per_session: number } {
  const days = data.training_days_per_week;
  if (!wholeNumber(days, 0, 7) || days === 0) {
    return { training_days_per_week: 0, training_minutes_per_session: 0 };
  }
  const minutes = data.training_minutes_per_session;
  if (!wholeNumber(minutes, MIN_SESSION_MINUTES, MAX_SESSION_MINUTES)) {
    return { training_days_per_week: 0, training_minutes_per_session: 0 };
  }
  return { training_days_per_week: days, training_minutes_per_session: minutes };
}

/** The training screen still required before the plan can be saved. Zero days needs no duration. */
export function missingTrainingStep(
  data: Pick<OnboardingPayload, 'training_days_per_week' | 'training_minutes_per_session'>,
): Extract<QuizStep, 'training_days' | 'training_duration'> | null {
  const days = data.training_days_per_week;
  if (!wholeNumber(days, 0, 7)) return 'training_days';
  if (days === 0) return null;
  const minutes = data.training_minutes_per_session;
  if (!wholeNumber(minutes, MIN_SESSION_MINUTES, MAX_SESSION_MINUTES)) return 'training_duration';
  return null;
}
