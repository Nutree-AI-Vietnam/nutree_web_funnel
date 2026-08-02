import { describe, it, expect } from 'vitest';
import { calculateBmr, calculateTdee, calculateMacros, computeTdeeResult } from './calculator';

describe('BMR', () => {
  it('Mifflin-St Jeor male: 30y, 75kg, 175cm', () => {
    expect(calculateBmr({ age: 30, sex: 'male', weightKg: 75, heightCm: 175 })).toBeCloseTo(
      1698.75,
      2,
    );
  });

  it('Mifflin-St Jeor female: 25y, 55kg, 160cm', () => {
    expect(calculateBmr({ age: 25, sex: 'female', weightKg: 55, heightCm: 160 })).toBeCloseTo(
      1264,
      2,
    );
  });

  it('Katch-McArdle when body fat provided: 75kg @ 20%', () => {
    expect(
      calculateBmr({ age: 30, sex: 'male', weightKg: 75, heightCm: 175, bodyFatPercentage: 20 }),
    ).toBeCloseTo(1666, 2);
  });
});

describe('TDEE', () => {
  it('applies job multiplier (desk=1.2, on_feet=1.4, physical=1.6)', () => {
    const base = { age: 30, sex: 'male' as const, weightKg: 75, heightCm: 175 };
    expect(calculateTdee({ ...base, jobType: 'desk' })).toBeCloseTo(2038.5, 1);
    expect(calculateTdee({ ...base, jobType: 'on_feet' })).toBeCloseTo(2378.25, 1);
    expect(calculateTdee({ ...base, jobType: 'physical' })).toBeCloseTo(2718.0, 1);
  });
});

describe('macros', () => {
  it('cut: tdee-500 kcal, 2.2 g/kg protein, fat dual-gate picks weight-based', () => {
    const m = calculateMacros({ tdee: 2038.5, goal: 'cut', weightKg: 75 });
    expect(m.calories).toBeCloseTo(1538.5, 1);
    expect(m.protein_g).toBeCloseTo(165, 1);
    expect(m.fat_g).toBeCloseTo(60, 1);
    expect(m.carbs_g).toBeCloseTo(84.625, 2);
  });

  it('recomp female: fat dual-gate close call picks weight-based', () => {
    const m = calculateMacros({ tdee: 1769.6, goal: 'recomp', weightKg: 55 });
    expect(m.calories).toBeCloseTo(1769.6, 1);
    expect(m.protein_g).toBeCloseTo(110, 1);
    expect(m.fat_g).toBeCloseTo(49.5, 1);
    expect(m.carbs_g).toBeCloseTo(221.025, 2);
  });

  it('bulk beginner: training-level protein 1.8 g/kg, fat dual-gate picks percent-based', () => {
    const m = calculateMacros({ tdee: 2688, goal: 'bulk', weightKg: 70, trainingLevel: 'beginner' });
    expect(m.protein_g).toBeCloseTo(126, 1);
    expect(m.fat_g).toBeCloseTo(83, 1);
    expect(m.carbs_g).toBeCloseTo(434.25, 2);
  });

  it('clamps protein to 60g minimum', () => {
    const m = calculateMacros({ tdee: 1200, goal: 'cut', weightKg: 25 });
    expect(m.protein_g).toBe(60);
  });

  it('clamps carbs to 50g minimum', () => {
    const m = calculateMacros({ tdee: 1300, goal: 'cut', weightKg: 90 });
    expect(m.carbs_g).toBe(50);
  });
});

describe('computeTdeeResult (end-to-end from payload)', () => {
  it('returns full normalized result', () => {
    const r = computeTdeeResult({
      birth_year: 1996,
      birth_month: 3,
      birth_day: 14,
      gender: 'male',
      weight_kg: 75,
      height_cm: 175,
      job_type: 'desk',
      fitness_goal: 'cut',
    });
    expect(r).not.toBeNull();
    expect(r!.bmr).toBeCloseTo(1698.75, 2);
    expect(r!.tdee).toBeCloseTo(2038.5, 1);
    expect(r!.calories).toBeCloseTo(1538.5, 1);
  });

  it('returns null when required fields missing', () => {
    expect(computeTdeeResult({ birth_year: 1996, birth_month: 3, birth_day: 14 })).toBeNull();
  });
});
