import { describe, expect, it } from 'vitest';
import { buildProgressProjection } from './progress-projection';
import type { TdeeResult } from './types';

const tdee: TdeeResult = {
  bmr: 1500,
  tdee: 2100,
  calories: 1800.4,
  protein_g: 126.2,
  carbs_g: 180,
  fat_g: 60,
};

describe('buildProgressProjection', () => {
  it('projects a weight path when the chosen target is meaningfully different', () => {
    const projection = buildProgressProjection(
      { measurement_unit: 'metric', fitness_goal: 'cut', weight_kg: 70, target_weight_kg: 60 },
      tdee,
    );

    expect(projection).toMatchObject({
      kind: 'weight',
      current: 70,
      midpoint: 65,
      target: 60,
      days: 140,
      reducing: true,
    });
  });

  it('projects a gain path when the target is higher', () => {
    const projection = buildProgressProjection(
      { measurement_unit: 'metric', fitness_goal: 'bulk', weight_kg: 60, target_weight_kg: 65 },
      null,
    );

    expect(projection).toMatchObject({ kind: 'weight', reducing: false, days: 70 });
  });

  it('still shows a cut plan when the person did not lock a target weight', () => {
    const projection = buildProgressProjection(
      { measurement_unit: 'metric', fitness_goal: 'cut', weight_kg: 68, target_weight_unsure: true, training_days_per_week: 3 },
      tdee,
    );

    expect(projection).toEqual({
      kind: 'plan',
      goal: 'cut',
      direction: 'down',
      currentKg: 68,
      calories: 1800,
      proteinG: 126,
      trainingDays: 3,
    });
  });

  it('shows a steady plan when the target matches the current weight', () => {
    const projection = buildProgressProjection(
      { measurement_unit: 'metric', fitness_goal: 'maintain', weight_kg: 62, target_weight_kg: 62 },
      tdee,
    );

    expect(projection).toMatchObject({ kind: 'plan', goal: 'maintain', direction: 'steady', currentKg: 62 });
  });

  it('shows a plan from the goal alone when numbers are still missing', () => {
    const projection = buildProgressProjection({ measurement_unit: 'metric', fitness_goal: 'bulk' }, null);

    expect(projection).toEqual({
      kind: 'plan',
      goal: 'bulk',
      direction: 'up',
      currentKg: null,
      calories: null,
      proteinG: null,
      trainingDays: null,
    });
  });
});
