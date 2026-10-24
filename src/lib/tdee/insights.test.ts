import { describe, it, expect } from 'vitest';
import { bmi, bmiCategory, formatBmi, weeksToTarget, wholePercents } from './insights';

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

describe('formatBmi', () => {
  it('uses the locale decimal mark', () => {
    expect(formatBmi(26, 'en')).toBe('26.0');
    expect(formatBmi(26, 'vi')).toBe('26,0');
    expect(formatBmi(22.46, 'vi')).toBe('22,5');
  });
});

describe('wholePercents', () => {
  it('always adds up to 100', () => {
    // 33.3 / 33.3 / 33.3 would round to 99, and 30.5 / 30.5 / 39 to 101.
    expect(wholePercents([1, 1, 1])).toEqual([34, 33, 33]);
    expect(wholePercents([30.5, 30.5, 39]).reduce((a, b) => a + b, 0)).toBe(100);
    expect(wholePercents([600, 820, 585]).reduce((a, b) => a + b, 0)).toBe(100);
  });

  it('returns zeros when there is nothing to share', () => {
    expect(wholePercents([0, 0, 0])).toEqual([0, 0, 0]);
  });
});
