/** Step slugs = OnboardingScreenId.rcKey from nutree_ai; order per design spec. */
export const QUIZ_STEPS = [
  // Section 1: Greetings & pain points
  'name_ask',
  'goal',
  'target_weight',
  'challenges',
  'referral_source',
  'duration',
  'reflection',
  // Section 2: Personal info
  'sex',
  'age',
  'height_weight',
  'body_fat',
  // Section 3: Training
  'training_days',
  'training_duration',
  'experience',
  'training_type',
  // Section 4: Daily life
  'activity_level',
  'diet',
  // Section 5: Feature promos
  'tdee_science_promo',
  'smart_macro_promo',
  'smart_meals_promo',
  // Section 6: Results
  'calculating',
  'tdee_targets',
  'result_promising',
] as const;

export type QuizStep = (typeof QUIZ_STEPS)[number];

export function isQuizStep(slug: string): slug is QuizStep {
  return (QUIZ_STEPS as readonly string[]).includes(slug);
}

/** Route after `step`; the funnel continues to /email after the last quiz step. */
export function nextRoute(step: QuizStep): string {
  const i = QUIZ_STEPS.indexOf(step);
  return i === QUIZ_STEPS.length - 1 ? '/email' : `/quiz/${QUIZ_STEPS[i + 1]}`;
}

/** Route before `step`; the landing page precedes the first step. */
export function prevRoute(step: QuizStep): string {
  const i = QUIZ_STEPS.indexOf(step);
  return i === 0 ? '/' : `/quiz/${QUIZ_STEPS[i - 1]}`;
}

/** 1-based index for the progress bar. */
export function stepIndex(step: QuizStep): number {
  return QUIZ_STEPS.indexOf(step) + 1;
}
