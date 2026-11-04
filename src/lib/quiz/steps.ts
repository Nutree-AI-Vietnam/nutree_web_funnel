/** Final web funnel order. Keep slugs stable because persisted quiz state uses them. */
export const QUIZ_STEPS = [
  'goal',
  'sex',
  'age_group',
  'proof',
  'aim',
  'body_current',
  'body_target',
  'zones',
  'occasion',
  'height',
  'weight',
  'target_weight',
  'progress',
  'activity_level',
  'training_days',
  'training_duration',
  'tried',
  'obstacle',
  'diet_style',
  'weekend',
  'trigger',
  'with_you',
  'calculating',
  'result',
] as const;

export type QuizStep = (typeof QUIZ_STEPS)[number];

/** Product tour after email: the plan, then photo logging. Same onboarding bar as the quiz. The rating and feature list live on the paywall. */
export const VALUE_TOUR_STEPS = ['plan', 'snap', 'activity', 'macros', 'sources'] as const;

export type ValueTourStep = (typeof VALUE_TOUR_STEPS)[number];

export function onboardingStepCount(): number {
  return QUIZ_STEPS.length + VALUE_TOUR_STEPS.length;
}

/** 1-based position of a value screen on the shared onboarding bar. */
export function valueProgressIndex(step: ValueTourStep): number {
  return QUIZ_STEPS.length + VALUE_TOUR_STEPS.indexOf(step) + 1;
}
export type QuizChapter = 'intent' | 'body' | 'routine' | 'plan';

export const STEP_CHAPTERS: Record<QuizStep, QuizChapter> = {
  goal: 'intent',
  sex: 'intent',
  age_group: 'intent',
  proof: 'intent',
  aim: 'intent',
  body_current: 'body',
  body_target: 'body',
  zones: 'body',
  occasion: 'body',
  height: 'body',
  weight: 'body',
  target_weight: 'body',
  progress: 'body',
  activity_level: 'routine',
  training_days: 'routine',
  training_duration: 'routine',
  tried: 'routine',
  obstacle: 'routine',
  diet_style: 'routine',
  weekend: 'routine',
  trigger: 'routine',
  with_you: 'routine',
  calculating: 'plan',
  result: 'plan',
};

/** Screens that ask the visitor something, for the question count on the proof screen. */
const QUESTION_STEPS: readonly QuizStep[] = [
  'goal',
  'sex',
  'age_group',
  'aim',
  'body_current',
  'body_target',
  'zones',
  'occasion',
  'height',
  'weight',
  'target_weight',
  'activity_level',
  'training_days',
  'training_duration',
  'tried',
  'obstacle',
  'diet_style',
  'weekend',
  'trigger',
];

/** Questions left from this step on, counting the step itself when it asks one. */
export function questionCount(from: QuizStep = 'goal'): number {
  const start = QUIZ_STEPS.indexOf(from);
  return QUESTION_STEPS.filter((step) => QUIZ_STEPS.indexOf(step) >= start).length;
}

export function isQuizStep(slug: string): slug is QuizStep {
  return (QUIZ_STEPS as readonly string[]).includes(slug);
}

/** Returns the next in-app screen, or null when the quiz is complete. */
export function nextStep(step: QuizStep): QuizStep | null {
  const i = QUIZ_STEPS.indexOf(step);
  return i === QUIZ_STEPS.length - 1 ? null : QUIZ_STEPS[i + 1];
}

/** Returns the previous in-app screen, or null when the landing page precedes it. The loader only plays on the way forward. */
export function previousStep(step: QuizStep): QuizStep | null {
  const i = QUIZ_STEPS.indexOf(step);
  if (i <= 0) return null;
  const previous = QUIZ_STEPS[i - 1];
  return previous === 'calculating' ? QUIZ_STEPS[i - 2] : previous;
}

/** 1-based index for the progress bar. */
export function stepIndex(step: QuizStep): number {
  return QUIZ_STEPS.indexOf(step) + 1;
}

