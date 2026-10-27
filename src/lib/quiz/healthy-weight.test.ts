import { describe, expect, it } from 'vitest';
import { healthyWeightRange, savedTargetFits, targetBelowHealthyRange } from './healthy-weight';
import { formatWeight, poundsToKg } from './units';

describe('healthyWeightRange', () => {
  it('shows a low end in pounds that the picker accepts', () => {
    // 165 cm: BMI 18.5 is 50.37 kg, which is 111.04 lb. 111 lb is under it, so the range starts at 112 lb.
    const range = healthyWeightRange(165, 'imperial');
    expect(formatWeight(range.lowKg, 'imperial')).toBe('112 lb');
    expect(targetBelowHealthyRange(poundsToKg(112), { weight_kg: 80, height_cm: 165 }, 'imperial')).toBe(false);
    expect(targetBelowHealthyRange(poundsToKg(111), { weight_kg: 80, height_cm: 165 }, 'imperial')).toBe(true);
  });

  it('uses whole kilograms in metric, rounded inward', () => {
    expect(healthyWeightRange(165, 'metric')).toEqual({ lowKg: 51, highKg: 67 });
    expect(targetBelowHealthyRange(51, { weight_kg: 80, height_cm: 165 }, 'metric')).toBe(false);
    expect(targetBelowHealthyRange(50, { weight_kg: 80, height_cm: 165 }, 'metric')).toBe(true);
  });

  it('allows a gain that still sits under the range', () => {
    expect(targetBelowHealthyRange(48, { weight_kg: 45, height_cm: 165 }, 'metric')).toBe(false);
  });
});

describe('savedTargetFits', () => {
  const base = { measurement_unit: 'metric' as const, height_cm: 165, weight_kg: 70 };

  it('fits when the goal and the target point the same way', () => {
    expect(savedTargetFits({ ...base, fitness_goal: 'cut', target_weight_kg: 62 }, 'metric')).toBe(true);
  });

  it('does not fit when the goal and the target disagree, or the target is under the range', () => {
    expect(savedTargetFits({ ...base, fitness_goal: 'bulk', target_weight_kg: 62 }, 'metric')).toBe(false);
    expect(savedTargetFits({ ...base, fitness_goal: 'cut', target_weight_kg: 49 }, 'metric')).toBe(false);
  });
});
