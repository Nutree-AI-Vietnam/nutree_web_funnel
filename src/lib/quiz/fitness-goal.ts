import type { OnboardingPayload } from './types';

type FitnessGoal = OnboardingPayload['fitness_goal'];

/** Goals the backend calculator accepts; it has no separate "maintain". */
export type BackendGoal = 'cut' | 'bulk' | 'recomp';

/** Same tolerance as the app's target-weight screen. */
const SAME_WEIGHT_TOLERANCE_KG = 1;

/** Maps the quiz goal onto the backend calculator; maintain is planned at maintenance calories like recomp. */
export function toBackendGoal(goal: FitnessGoal): BackendGoal | undefined {
  if (goal == null) return undefined;
  return goal === 'maintain' ? 'recomp' : goal;
}

/** The goal a target weight points to, using the app's rule. */
export function goalForTargetWeight(currentKg: number, targetKg: number): BackendGoal {
  const difference = targetKg - currentKg;
  if (Math.abs(difference) <= SAME_WEIGHT_TOLERANCE_KG) return 'recomp';
  return difference < 0 ? 'cut' : 'bulk';
}

/**
 * The goal to keep once a target weight is chosen. Like the app, a target that
 * points the other way replaces the selected goal, so the plan never adds
 * calories for someone who wants to lose weight. A "maintain" choice survives
 * when the target stays within the tolerance.
 */
export function goalAfterTargetWeight(goal: FitnessGoal, currentKg: number | undefined, targetKg: number): FitnessGoal {
  if (currentKg == null || !Number.isFinite(currentKg) || !Number.isFinite(targetKg)) return goal;
  const derived = goalForTargetWeight(currentKg, targetKg);
  return toBackendGoal(goal) === derived ? goal : derived;
}
