import type { OnboardingPayload, TdeeResult } from './types';

const WEIGHT_GAP_KG = 0.5;
const KG_PER_WEEK = 0.5;

export type ProgressDirection = 'down' | 'up' | 'steady';
export type PlanGoal = NonNullable<OnboardingPayload['fitness_goal']> | 'fallback';

export type ProgressProjection =
  | {
      kind: 'weight';
      current: number;
      midpoint: number;
      target: number;
      days: number;
      reducing: boolean;
    }
  | {
      kind: 'plan';
      goal: PlanGoal;
      direction: ProgressDirection;
      currentKg: number | null;
      calories: number | null;
      proteinG: number | null;
      trainingDays: number | null;
    };

function finiteNumber(value: number | undefined): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function directionForGoal(goal: OnboardingPayload['fitness_goal']): ProgressDirection {
  if (goal === 'cut') return 'down';
  if (goal === 'bulk') return 'up';
  return 'steady';
}

/**
 * A locked weight gap becomes a weight path. Every other combination of answers
 * still produces a plan result from the goal, calories, and training rhythm.
 */
export function buildProgressProjection(data: OnboardingPayload, tdee: TdeeResult | null): ProgressProjection {
  const current = finiteNumber(data.weight_kg);
  const target = finiteNumber(data.target_weight_kg);
  if (current != null && target != null && Math.abs(current - target) > WEIGHT_GAP_KG) {
    const delta = Math.abs(current - target);
    return {
      kind: 'weight',
      current,
      midpoint: Number((current + (target - current) / 2).toFixed(1)),
      target,
      days: Math.max(4, Math.ceil((delta / KG_PER_WEEK) * 7)),
      reducing: target < current,
    };
  }

  return {
    kind: 'plan',
    goal: data.fitness_goal ?? 'fallback',
    direction: directionForGoal(data.fitness_goal),
    currentKg: current,
    calories: tdee ? Math.round(tdee.calories) : null,
    proteinG: tdee ? Math.round(tdee.protein_g) : null,
    trainingDays: finiteNumber(data.training_days_per_week),
  };
}
