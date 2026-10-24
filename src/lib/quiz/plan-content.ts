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
  | 'tempeh_bowl'
  | 'chickpea_quinoa'
  | 'salmon_potatoes'
  | 'beef_stir_fry'
  | 'tofu_stir_fry'
  | 'lentil_curry'
  | 'yogurt_berries'
  | 'protein_shake'
  | 'apple_peanut_butter'
  | 'hummus_carrots';

/**
 * Candidates per meal, most common first. `proteinPer100` is the estimated grams of protein per
 * 100 kcal of the dish as Nutree portions it. The last one in each list fits every diet answer.
 */
const DISHES: Record<Meal, ReadonlyArray<{ id: DishId; contains: readonly Ingredient[]; proteinPer100: number }>> = {
  breakfast: [
    { id: 'eggs_toast', contains: ['egg', 'gluten'], proteinPer100: 6 },
    { id: 'yogurt_oats', contains: ['dairy', 'gluten'], proteinPer100: 7.5 },
    { id: 'tofu_scramble', contains: [], proteinPer100: 9 },
    { id: 'chia_pudding', contains: [], proteinPer100: 4 },
  ],
  lunch: [
    { id: 'chicken_rice_bowl', contains: ['meat'], proteinPer100: 8 },
    { id: 'tuna_salad', contains: ['fish'], proteinPer100: 10 },
    { id: 'tempeh_bowl', contains: [], proteinPer100: 9.5 },
    { id: 'chickpea_quinoa', contains: [], proteinPer100: 4.5 },
  ],
  dinner: [
    { id: 'salmon_potatoes', contains: ['fish'], proteinPer100: 7 },
    { id: 'beef_stir_fry', contains: ['meat', 'gluten'], proteinPer100: 7.5 },
    { id: 'tofu_stir_fry', contains: [], proteinPer100: 9.5 },
    { id: 'lentil_curry', contains: [], proteinPer100: 5 },
  ],
  snack: [
    { id: 'yogurt_berries', contains: ['dairy'], proteinPer100: 9 },
    { id: 'protein_shake', contains: [], proteinPer100: 13 },
    { id: 'apple_peanut_butter', contains: ['nuts'], proteinPer100: 3 },
    { id: 'hummus_carrots', contains: [], proteinPer100: 3.5 },
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

function allowedDishes(meal: Meal, diet: readonly string[] | undefined) {
  const excluded = excludedIngredients(diet);
  const options = DISHES[meal].filter((dish) => dish.contains.every((item) => !excluded.has(item)));
  return options.length ? options : [DISHES[meal][DISHES[meal].length - 1]];
}

export function dishFor(meal: Meal, diet: readonly string[] | undefined): DishId {
  return allowedDishes(meal, diet)[0].id;
}

export interface SampleMeal {
  meal: Meal;
  dish: DishId;
  calories: number;
  /** Estimated grams of protein in this portion. */
  proteinG: number;
}

/**
 * A day of meals that fits the diet answers, adds up to the calorie target, and comes as close
 * as the dishes allow to the protein target. Ties go to the more common dishes.
 */
export function sampleDay(calories: number, diet: readonly string[] | undefined, proteinTarget?: number): SampleMeal[] {
  const total = Math.round(calories);
  const portions = MEALS.map((meal) => (meal === 'dinner' ? 0 : Math.round((total * MEAL_SHARE[meal]) / 10) * 10));
  portions[MEALS.indexOf('dinner')] = total - portions.reduce((sum, kcal) => sum + kcal, 0);
  const options = MEALS.map((meal) => allowedDishes(meal, diet));
  const protein = (choice: readonly number[]) => choice.reduce((sum, pick, index) => sum + (portions[index] * options[index][pick].proteinPer100) / 100, 0);
  let best = MEALS.map(() => 0);
  if (proteinTarget) {
    let bestGap = Math.abs(protein(best) - proteinTarget);
    const visit = (index: number, choice: number[]) => {
      if (index === MEALS.length) {
        const gap = Math.abs(protein(choice) - proteinTarget);
        if (gap < bestGap - 0.5) { best = [...choice]; bestGap = gap; }
        return;
      }
      for (let pick = 0; pick < options[index].length; pick += 1) visit(index + 1, [...choice, pick]);
    };
    visit(0, []);
  }
  return MEALS.map((meal, index) => {
    const dish = options[index][best[index]];
    return { meal, dish: dish.id, calories: portions[index], proteinG: Math.round((portions[index] * dish.proteinPer100) / 100) };
  });
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

/** Which answer a first change answers, so the plan can say "you said X, so Y". */
export type ChangeSource =
  | { kind: 'moment'; key: NonNullable<OnboardingPayload['hardest_eating_moment']> }
  | { kind: 'challenge'; key: string }
  | { kind: 'cooking' }
  | { kind: 'goal' };

export interface FirstChange {
  id: ChangeId;
  source: ChangeSource;
}

/**
 * Three first changes built from the answers: the off-plan moment, eating out
 * when they rarely cook, then the blockers in the order they were picked, then
 * protein as the default.
 */
export function firstChangePlan(
  data: Pick<OnboardingPayload, 'hardest_eating_moment' | 'pain_points'>,
  answers: { cooking?: 'home' | 'out' } = {},
): FirstChange[] {
  const picks: FirstChange[] = [];
  const add = (id: ChangeId | undefined, source: ChangeSource) => {
    if (id && !picks.some((pick) => pick.id === id) && picks.length < 3) picks.push({ id, source });
  };
  if (data.hardest_eating_moment) add(data.hardest_eating_moment, { kind: 'moment', key: data.hardest_eating_moment });
  if (answers.cooking === 'out') add('eating_out', { kind: 'cooking' });
  for (const challenge of data.pain_points ?? []) add(CHANGE_FOR_CHALLENGE[challenge], { kind: 'challenge', key: challenge });
  for (const fallback of ['protein', 'photo_logging', 'meal_ideas'] as const) add(fallback, { kind: 'goal' });
  return picks;
}

/** The answers each paywall app row can name: photo logging, meal ideas, then the coach. */
const APP_ROW_ANSWERS: { moments: string[]; cooking?: true; challenges: string[] }[] = [
  { moments: ['eating_out'], cooking: true, challenges: ['no_time'] },
  { moments: ['morning', 'lunch'], challenges: ['dont_know_what_to_eat'] },
  { moments: ['late_night', 'evening'], challenges: ['cravings', 'stress_eating'] },
];

/**
 * The answer each of the paywall's four app rows is tagged with, or null. Per row the off-plan
 * moment wins, then eating out, then the blockers in the order they were picked. The rows never
 * share an answer, so no tag repeats; the fourth row (pace) names the goal in its title instead.
 */
export function appIncludeSources(
  data: Pick<OnboardingPayload, 'hardest_eating_moment' | 'pain_points'>,
  answers: { cooking?: 'home' | 'out' } = {},
): (ChangeSource | null)[] {
  const moment = data.hardest_eating_moment;
  const rows = APP_ROW_ANSWERS.map((row): ChangeSource | null => {
    if (moment && row.moments.includes(moment)) return { kind: 'moment', key: moment };
    if (row.cooking && answers.cooking === 'out') return { kind: 'cooking' };
    const challenge = (data.pain_points ?? []).find((key) => row.challenges.includes(key));
    return challenge ? { kind: 'challenge', key: challenge } : null;
  });
  return [...rows, null];
}

export function firstChanges(
  data: Pick<OnboardingPayload, 'hardest_eating_moment' | 'pain_points'>,
  answers: { cooking?: 'home' | 'out' } = {},
): ChangeId[] {
  return firstChangePlan(data, answers).map((change) => change.id);
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
