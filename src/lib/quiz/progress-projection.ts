import { computeTdeeResult } from '../tdee/calculator';
import type { OnboardingPayload, TdeeResult } from './types';
import { formatWeight, NBSP, type UnitSystem } from './units';

const WEIGHT_GAP_KG = 0.5;
/** Energy in a kilogram of body weight; the app's progress screens use the same figure. */
const KCAL_PER_KG = 7700;
/** Below this daily gap from maintenance the calorie targets barely move weight, so no goal date is promised. */
const MIN_DAILY_GAP_KCAL = 50;

/**
 * Weekly change the calorie targets support: the daily gap between the target and maintenance, at
 * 7,700 kcal per kg. Null while the targets cannot be worked out, or when they barely move weight
 * (the floors at BMR and the clinical minimum can leave a small person almost no deficit).
 */
export function planKgPerWeek(tdee: TdeeResult | null, reducing: boolean): number | null {
  if (!tdee) return null;
  const dailyGap = reducing ? tdee.tdee - tdee.calories : tdee.calories - tdee.tdee;
  return dailyGap >= MIN_DAILY_GAP_KCAL ? (dailyGap * 7) / KCAL_PER_KG : null;
}

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
      kgPerWeek: number;
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
 * A locked weight gap becomes a weight path at the pace the calorie targets support. Every other
 * combination of answers still produces a plan result from the goal, calories, and training rhythm.
 * Without `tdee` the targets are worked out from the answers, as the app's preview does.
 */
export function buildProgressProjection(data: OnboardingPayload, tdee: TdeeResult | null): ProgressProjection {
  const current = finiteNumber(data.weight_kg);
  const target = finiteNumber(data.target_weight_kg);
  if (current != null && target != null && Math.abs(current - target) > WEIGHT_GAP_KG) {
    const reducing = target < current;
    const kgPerWeek = planKgPerWeek(tdee ?? computeTdeeResult(data), reducing);
    if (kgPerWeek != null) {
      const delta = Math.abs(current - target);
      return {
        kind: 'weight',
        current,
        midpoint: Number((current + (target - current) / 2).toFixed(1)),
        target,
        days: Math.max(4, Math.ceil((delta / kgPerWeek) * 7)),
        reducing,
        kgPerWeek,
      };
    }
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

const DAY_MS = 86_400_000;

/** The one goal date and milestones every screen shows, from the same pace as the projected path. */
export interface GoalTimeline {
  currentKg: number;
  targetKg: number;
  days: number;
  weeks: number;
  reducing: boolean;
  date: Date;
  week1Date: Date;
  month1Date: Date;
  week1Kg: number;
  month1Kg: number;
  kgPerWeek: number;
}

/** Null when there is no locked weight gap to project, or the calorie targets barely move weight. */
export function goalTimeline(data: OnboardingPayload, now = new Date()): GoalTimeline | null {
  const projection = buildProgressProjection(data, null);
  if (projection.kind !== 'weight') return null;
  const { current, target, days, reducing, kgPerWeek } = projection;
  const gap = Math.abs(target - current);
  const after = (elapsedDays: number) => current + (reducing ? -1 : 1) * Math.min(gap, (kgPerWeek * elapsedDays) / 7);
  const at = (elapsedDays: number) => new Date(now.getTime() + elapsedDays * DAY_MS);
  return {
    currentKg: current,
    targetKg: target,
    days,
    weeks: Math.ceil(days / 7),
    reducing,
    date: at(days),
    week1Date: at(Math.min(7, days)),
    month1Date: at(Math.min(30, days)),
    week1Kg: after(7),
    month1Kg: after(30),
    kgPerWeek,
  };
}

/**
 * The first milestone that reads as a change in the visitor's units: week one, or month one when a week's
 * loss rounds to the starting number (a quarter kilogram is no change in whole pounds).
 */
export function firstWin(timeline: GoalTimeline, system: UnitSystem, locale: string): { kg: number; date: Date } {
  const weekShows = formatWeight(timeline.week1Kg, system, locale) !== formatWeight(timeline.currentKg, system, locale);
  return weekShows ? { kg: timeline.week1Kg, date: timeline.week1Date } : { kg: timeline.month1Kg, date: timeline.month1Date };
}

/** "Mar 31, 2027" in English, "31 thg 3, 2027" in Vietnamese, with no-break spaces so a headline keeps the date on one line. */
export function formatGoalDate(date: Date, locale: string, withYear = true): string {
  return new Intl.DateTimeFormat(locale === 'vi' ? 'vi-VN' : 'en-US', {
    day: 'numeric',
    month: 'short',
    ...(withYear ? { year: 'numeric' } : {}),
  }).format(date).replace(/\s/g, NBSP);
}
