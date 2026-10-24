/** Final web funnel order. Keep slugs stable because persisted quiz state uses them. */
export const QUIZ_STEPS = [
  'goal',
  'name_ask',
  'welcome',
  'challenges',
  'motivation',
  'reflection',
  'sex',
  'age',
  'height',
  'weight',
  'target_weight',
  'body_review',
  'activity_level',
  'training_days',
  'training_duration',
  'eating_pattern',
  'diet',
  'step_goal',
  'not_alone',
  'calculating',
  'result',
  'progress',
  'confidence',
] as const;

export type QuizStep = (typeof QUIZ_STEPS)[number];

/** Product tour after email: the plan, then photo logging. Same onboarding bar as the quiz. The rating and feature list live on the paywall. */
export const VALUE_TOUR_STEPS = ['plan', 'sources', 'snap'] as const;

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
  name_ask: 'intent',
  welcome: 'intent',
  challenges: 'intent',
  motivation: 'intent',
  reflection: 'intent',
  sex: 'body',
  age: 'body',
  height: 'body',
  weight: 'body',
  target_weight: 'body',
  body_review: 'body',
  activity_level: 'routine',
  training_days: 'routine',
  training_duration: 'routine',
  eating_pattern: 'routine',
  diet: 'routine',
  step_goal: 'routine',
  not_alone: 'routine',
  calculating: 'plan',
  result: 'plan',
  progress: 'plan',
  confidence: 'plan',
};

/** Screens that ask the visitor something, for the question count on the welcome screen. */
const QUESTION_STEPS: readonly QuizStep[] = [
  'goal',
  'name_ask',
  'challenges',
  'motivation',
  'sex',
  'age',
  'height',
  'weight',
  'target_weight',
  'activity_level',
  'training_days',
  'training_duration',
  'eating_pattern',
  'diet',
  'step_goal',
  'confidence',
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

/** Returns the previous in-app screen, or null when the landing page precedes it. */
export function previousStep(step: QuizStep): QuizStep | null {
  const i = QUIZ_STEPS.indexOf(step);
  return i === 0 ? null : QUIZ_STEPS[i - 1];
}

/** 1-based index for the progress bar. */
export function stepIndex(step: QuizStep): number {
  return QUIZ_STEPS.indexOf(step) + 1;
}

