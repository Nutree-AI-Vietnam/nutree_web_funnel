import { goalAfterTargetWeight } from './fitness-goal';
import type { OnboardingPayload } from './types';
import { poundsToKg, type UnitSystem } from './units';

export const HEALTHY_BMI_LOW = 18.5;
export const HEALTHY_BMI_HIGH = 24.9;
const KG_PER_POUND = 0.45359237;

/** Weight in kg at a BMI for this height. */
export function weightAtBmi(value: number, heightCm: number): number {
  const meters = heightCm / 100;
  return value * meters * meters;
}

/**
 * The healthy range (BMI 18.5 to 24.9) for this height, in kg, at the whole kilograms or pounds the
 * picker offers: the low end rounded up and the high end down, so the range shown and the lowest
 * target accepted are the same number.
 */
export function healthyWeightRange(heightCm: number, system: UnitSystem): { lowKg: number; highKg: number } {
  const low = weightAtBmi(HEALTHY_BMI_LOW, heightCm);
  const high = weightAtBmi(HEALTHY_BMI_HIGH, heightCm);
  if (system === 'metric') return { lowKg: Math.ceil(low), highKg: Math.floor(high) };
  return { lowKg: poundsToKg(Math.ceil(low / KG_PER_POUND)), highKg: poundsToKg(Math.floor(high / KG_PER_POUND)) };
}

/** A loss target under the healthy range, which the target screen refuses. A gain that stays under it is allowed. */
export function targetBelowHealthyRange(targetKg: number, data: Pick<OnboardingPayload, 'weight_kg' | 'height_cm'>, system: UnitSystem): boolean {
  if (!data.height_cm || !Number.isFinite(data.height_cm)) return false;
  return targetKg < healthyWeightRange(data.height_cm, system).lowKg && targetKg < (data.weight_kg ?? Infinity);
}

/** Whether the saved target still matches the goal and the healthy range after another answer changed. */
export function savedTargetFits(data: OnboardingPayload, system: UnitSystem): boolean {
  const target = data.target_weight_kg;
  if (target == null) return true;
  if (goalAfterTargetWeight(data.fitness_goal, data.weight_kg, target) !== data.fitness_goal) return false;
  return !targetBelowHealthyRange(target, data, system);
}
