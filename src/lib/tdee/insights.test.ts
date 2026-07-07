import { describe, it, expect } from 'vitest';
import { bmi, bmiCategory, weeksToTarget } from './insights';

describe('bmi', () => {
  it('computes weight / (height m)^2', () => {
    expect(bmi(75, 175)).toBeCloseTo(24.49, 2);
  });

  it('categorizes per WHO cutoffs', () => {
    expect(bmiCategory(17)).toBe('underweight');
    expect(bmiCategory(22)).toBe('normal');
    expect(bmiCategory(27)).toBe('overweight');
    expect(bmiCategory(31)).toBe('obese');
  });
});

describe('weeksToTarget', () => {
  it('cut: 0.5 kg/week', () => {
    expect(weeksToTarget({ currentKg: 80, targetKg: 74, goal: 'cut' })).toBe(12);
  });

  it('bulk: 0.25 kg/week', () => {
    expect(weeksToTarget({ currentKg: 60, targetKg: 63, goal: 'bulk' })).toBe(12);
  });

  it('recomp or no target: null', () => {
    expect(weeksToTarget({ currentKg: 70, targetKg: undefined, goal: 'cut' })).toBeNull();
    expect(weeksToTarget({ currentKg: 70, targetKg: 65, goal: 'recomp' })).toBeNull();
  });
});
