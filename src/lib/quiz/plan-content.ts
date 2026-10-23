import type { OnboardingPayload, TdeeResult } from './types';

/** What a dish contains that a diet answer can rule out. */
type Ingredient = 'meat' | 'pork' | 'fish' | 'shellfish' | 'dairy' | 'egg' | 'gluten' | 'nuts';

export type Meal = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export type DishId =
  | 'eggs_toast'
  | 'yogurt_oats'
  | 'tofu_scramble'
  | 'chia_pudding'
  | 'chicken_rice_bowl'
  | 'tuna_salad'
  | 'chickpea_quinoa'
  | 'salmon_potatoes'
  | 'beef_stir_fry'
  | 'lentil_curry'
  | 'apple_peanut_butter'
  | 'yogurt_berries'
  | 'hummus_carrots';

/** Candidates per meal, most common first. The last one in each list fits every diet answer. */
const DISHES: Record<Meal, ReadonlyArray<{ id: DishId; contains: readonly Ingredient[] }>> = {
  breakfast: [
    { id: 'eggs_toast', contains: ['egg', 'gluten'] },
    { id: 'yogurt_oats', contains: ['dairy', 'gluten'] },
    { id: 'tofu_scramble', contains: [] },
    { id: 'chia_pudding', contains: [] },
  ],
  lunch: [
    { id: 'chicken_rice_bowl', contains: ['meat'] },
    { id: 'tuna_salad', contains: ['fish'] },
    { id: 'chickpea_quinoa', contains: [] },
  ],
  dinner: [
    { id: 'salmon_potatoes', contains: ['fish'] },
    { id: 'beef_stir_fry', contains: ['meat', 'gluten'] },
    { id: 'lentil_curry', contains: [] },
  ],
  snack: [
    { id: 'yogurt_berries', contains: ['dairy'] },
    { id: 'apple_peanut_butter', contains: ['nuts'] },
    { id: 'hummus_carrots', contains: [] },
  ],
};

const EXCLUDED_BY_DIET: Record<string, readonly Ingredient[]> = {
  vegan: ['meat', 'pork', 'fish', 'shellfish', 'dairy', 'egg'],
  gluten_free: ['gluten'],
  dairy_free: ['dairy'],
  nut_free: ['nuts'],
  egg_free: ['egg'],
  shellfish_free: ['shellfish'],
  halal: ['pork'],
};

/** Share of the day's calories per meal; dinner takes the rounding so the day adds up exactly. */
const MEAL_SHARE: Record<Meal, number> = { breakfast: 0.25, lunch: 0.35, dinner: 0.3, snack: 0.1 };
const MEALS: readonly Meal[] = ['breakfast', 'lunch', 'snack', 'dinner'];

function excludedIngredients(diet: readonly string[] | undefined): Set<Ingredient> {
  return new Set((diet ?? []).flatMap((answer) => EXCLUDED_BY_DIET[answer] ?? []));
}

export function dishFor(meal: Meal, diet: readonly string[] | undefined): DishId {
  const excluded = excludedIngredients(diet);
  const options = DISHES[meal];
  return (options.find((dish) => dish.contains.every((item) => !excluded.has(item))) ?? options[options.length - 1]).id;
}

export interface SampleMeal {
  meal: Meal;
  dish: DishId;
  calories: number;
}

/** A day of meals that fits the diet answers and adds up to the calorie target. */
export function sampleDay(calories: number, diet: readonly string[] | undefined): SampleMeal[] {
  const total = Math.round(calories);
  const rows = MEALS.map((meal) => ({
    meal,
    dish: dishFor(meal, diet),
    calories: meal === 'dinner' ? 0 : Math.round((total * MEAL_SHARE[meal]) / 10) * 10,
  }));
  const dinner = rows.find((row) => row.meal === 'dinner')!;
  dinner.calories = total - rows.reduce((sum, row) => sum + row.calories, 0);
  return rows;
}

export type ChangeId =
  | 'morning'
  | 'lunch'
  | 'evening'
  | 'late_night'
  | 'weekend'
  | 'eating_out'
  | 'photo_logging'
  | 'meal_ideas'
  | 'protein'
  | 'pause_snap'
  | 'weekly_weigh_in'
  | 'most_days'
  | 'one_number';

const CHANGE_FOR_CHALLENGE: Record<string, ChangeId> = {
  no_time: 'photo_logging',
  dont_know_what_to_eat: 'meal_ideas',
  cravings: 'protein',
  stress_eating: 'pause_snap',
  slow_progress: 'weekly_weigh_in',
  cant_stick_to_diet: 'most_days',
  past_failures: 'most_days',
  no_motivation: 'most_days',
  confusion: 'one_number',
};

/**
 * Three first changes built from the answers: the off-plan moment, eating out
 * when they rarely cook, then the blockers in the order they were picked, then
 * protein as the default.
 */
export function firstChanges(
  data: Pick<OnboardingPayload, 'hardest_eating_moment' | 'pain_points'>,
  answers: { cooking?: 'home' | 'out' } = {},
): ChangeId[] {
  const picks: ChangeId[] = [];
  const add = (id: ChangeId | undefined) => {
    if (id && !picks.includes(id) && picks.length < 3) picks.push(id);
  };
  add(data.hardest_eating_moment);
  if (answers.cooking === 'out') add('eating_out');
  for (const challenge of data.pain_points ?? []) add(CHANGE_FOR_CHALLENGE[challenge]);
  for (const fallback of ['protein', 'photo_logging', 'meal_ideas'] as const) add(fallback);
  return picks;
}

/** The numbers a change can quote. */
export interface PlanNumbers {
  calories: number;
  proteinG: number;
  snackCalories: number;
}

export function planNumbers(tdee: TdeeResult): PlanNumbers {
  const calories = Math.round(tdee.calories);
  return {
    calories,
    proteinG: Math.round(tdee.protein_g),
    snackCalories: Math.round((calories * MEAL_SHARE.snack) / 10) * 10,
  };
}

/** The plan length in weeks that a billing period covers, for "fits your timeline". */
export function periodWeeks(period: { number: number; unit: 'day' | 'week' | 'month' | 'year' } | null | undefined): number | null {
  if (!period || !(period.number > 0)) return null;
  const perUnit = { day: 1 / 7, week: 1, month: 52 / 12, year: 52 }[period.unit];
  return perUnit ? period.number * perUnit : null;
}

/** The shortest plan that covers the timeline, else the longest one. */
export function planForTimeline<T>(plans: readonly T[], weeksOf: (plan: T) => number | null, goalWeeks: number | null): T | undefined {
  if (goalWeeks == null) return undefined;
  const sized = plans.flatMap((plan) => {
    const weeks = weeksOf(plan);
    return weeks == null ? [] : [{ plan, weeks }];
  });
  if (!sized.length) return undefined;
  const covering = sized.filter((entry) => entry.weeks >= goalWeeks).sort((a, b) => a.weeks - b.weeks);
  return (covering[0] ?? sized.sort((a, b) => b.weeks - a.weeks)[0]).plan;
}
