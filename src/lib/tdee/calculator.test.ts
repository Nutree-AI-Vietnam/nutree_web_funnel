import { describe, expect, it } from 'vitest';
import type { OnboardingPayload } from '../quiz/types';
import { goalAfterTargetWeight } from '../quiz/fitness-goal';
import { computeTdeeResult } from './calculator';

const woman: OnboardingPayload = {
  age: 25,
  gender: 'female',
  weight_kg: 52,
  height_cm: 163,
  job_type: 'desk',
  fitness_goal: 'cut',
};
const man: OnboardingPayload = { ...woman, gender: 'male' };

describe('computeTdeeResult', () => {
  // Expected values come from the backend TdeeCalculationService for the same inputs.
  it('matches the backend for a woman cutting, floored at BMR', () => {
    expect(computeTdeeResult(woman)).toEqual({
      bmr: 1252.8,
      tdee: 1503.3,
      calories: 1252.8,
      protein_g: 93.6,
      carbs_g: 126,
      fat_g: 41.6,
    });
  });

  it('matches the backend for a man cutting, floored at the 1500 kcal minimum', () => {
    expect(computeTdeeResult(man)).toEqual({
      bmr: 1418.8,
      tdee: 1702.5,
      calories: 1500,
      protein_g: 93.6,
      carbs_g: 187.8,
      fat_g: 41.6,
    });
  });

  it('adds a 300 kcal surplus for bulk', () => {
    expect(computeTdeeResult({ ...man, age: 22, fitness_goal: 'bulk' })).toEqual({
      bmr: 1433.8,
      tdee: 1720.5,
      calories: 2020.1,
      protein_g: 83.2,
      carbs_g: 295.6,
      fat_g: 56.1,
    });
  });

  it('plans 52 kg aiming for 47 kg as a cut even when gain weight was picked', () => {
    const fitness_goal = goalAfterTargetWeight('bulk', 52, 47);
    expect(computeTdeeResult({ ...man, age: 22, fitness_goal, target_weight_kg: 47 })?.calories).toBe(1500);
  });

  it('plans maintain the same as recomp', () => {
    expect(computeTdeeResult({ ...woman, fitness_goal: 'maintain' })).toEqual(
      computeTdeeResult({ ...woman, fitness_goal: 'recomp' }),
    );
  });

  it('ignores the body fat estimate like the app does', () => {
    expect(computeTdeeResult({ ...woman, body_fat_percentage: 30 })).toEqual(computeTdeeResult(woman));
  });

  it('applies the protein, fat and carb limits', () => {
    const light = computeTdeeResult({ ...woman, weight_kg: 30, fitness_goal: 'recomp' });
    expect(light?.protein_g).toBe(60);
    expect(light?.fat_g).toBe(40);

    const heavy = computeTdeeResult({ ...woman, age: 120, weight_kg: 250, height_cm: 100 });
    expect(heavy).toMatchObject({ protein_g: 300, fat_g: 150, carbs_g: 50, calories: 2750 });
  });

  it('returns null until the required answers are present', () => {
    expect(computeTdeeResult({ ...woman, job_type: undefined })).toBeNull();
    expect(computeTdeeResult({ ...woman, fitness_goal: undefined })).toBeNull();
    expect(computeTdeeResult({ birth_year: 1996, birth_month: 3, birth_day: 14 })).toBeNull();
  });
});
