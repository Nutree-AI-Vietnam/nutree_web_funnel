import { describe, expect, it } from 'vitest';
import { goalFromSearch } from '@/lib/funnel/ad-goal';
import { dishFor, firstChanges, periodWeeks, planForTimeline, sampleDay } from './plan-content';
import { goalTimeline } from './progress-projection';

describe('goalTimeline', () => {
  it('gives the one goal date every screen shows: 180 to 155 lb is 159 days', () => {
    const now = new Date(Date.UTC(2026, 9, 23));
    const timeline = goalTimeline({ measurement_unit: 'metric', fitness_goal: 'cut', weight_kg: 81.6466, target_weight_kg: 70.307 }, now)!;
    expect(timeline.days).toBe(159);
    expect(timeline.weeks).toBe(23);
    expect(timeline.date.toISOString().slice(0, 10)).toBe('2027-03-31');
    expect(timeline.week1Kg).toBeCloseTo(81.1466, 3);
    expect(timeline.month1Kg).toBeLessThan(timeline.week1Kg);
  });

  it('has no date without a weight gap', () => {
    expect(goalTimeline({ measurement_unit: 'metric', fitness_goal: 'maintain', weight_kg: 60, target_weight_kg: 60 })).toBeNull();
  });
});

describe('sampleDay', () => {
  it('adds up to the calorie target exactly', () => {
    for (const calories of [1200, 1574, 1946.4, 2803]) {
      expect(sampleDay(calories, []).reduce((sum, meal) => sum + meal.calories, 0)).toBe(Math.round(calories));
    }
  });

  it('keeps meat, fish, dairy and eggs out of a vegan day', () => {
    expect(sampleDay(1600, ['vegan']).map((meal) => meal.dish)).toEqual(['tofu_scramble', 'chickpea_quinoa', 'apple_peanut_butter', 'lentil_curry']);
  });

  it('honours combined answers', () => {
    expect(dishFor('snack', ['dairy_free', 'nut_free'])).toBe('hummus_carrots');
    expect(dishFor('breakfast', ['egg_free'])).toBe('yogurt_oats');
    expect(dishFor('breakfast', ['gluten_free'])).toBe('tofu_scramble');
  });
});

describe('firstChanges', () => {
  it('starts from the off-plan moment, then the blockers, then protein', () => {
    expect(firstChanges({ hardest_eating_moment: 'morning', pain_points: ['no_time', 'cravings'] })).toEqual(['morning', 'photo_logging', 'protein']);
    expect(firstChanges({})).toEqual(['protein', 'photo_logging', 'meal_ideas']);
  });

  it('adds eating out for people who rarely cook', () => {
    expect(firstChanges({ hardest_eating_moment: 'evening' }, { cooking: 'out' })).toEqual(['evening', 'eating_out', 'protein']);
  });
});

describe('planForTimeline', () => {
  const plans = [
    { id: 'week', period: { number: 1, unit: 'week' as const } },
    { id: 'month', period: { number: 1, unit: 'month' as const } },
    { id: 'six', period: { number: 6, unit: 'month' as const } },
  ];
  const weeks = (plan: (typeof plans)[number]) => periodWeeks(plan.period);

  it('picks the shortest plan that covers the goal', () => {
    expect(planForTimeline(plans, weeks, 23)?.id).toBe('six');
    expect(planForTimeline(plans, weeks, 3)?.id).toBe('month');
  });

  it('falls back to the longest plan, and to none without a goal date', () => {
    expect(planForTimeline(plans, weeks, 40)?.id).toBe('six');
    expect(planForTimeline(plans, weeks, null)).toBeUndefined();
  });
});

describe('goalFromSearch', () => {
  it('reads the goal an ad link names', () => {
    expect(goalFromSearch('?goal=eat_healthier&utm_source=fb')).toBe('maintain');
    expect(goalFromSearch('?goal=LOSE_WEIGHT')).toBe('cut');
    expect(goalFromSearch('?goal=fly')).toBeNull();
    expect(goalFromSearch('')).toBeNull();
  });
});
