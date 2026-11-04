import type { Locale } from '@/lib/copy';

/**
 * English survey order at /survey/en. Keep this list stable.
 * Vietnamese uses VI_QUIZ_STEPS. Slugs stay stable because saved quiz state uses them.
 */
export const EN_QUIZ_STEPS = [
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
  'day_plan',
  'result',
] as const;

/**
 * Vietnamese survey on `/`. Same answer-taking slugs as English, reordered like a
 * coaching quiz: profile, body, a projection, habits with short lessons between
 * clusters, a loader, then the plan summary.
 */
export const VI_QUIZ_STEPS = [
  'goal',
  'sex',
  'age_group',
  'insight_pace',
  'height',
  'weight',
  'target_weight',
  'progress',
  'body_current',
  'body_target',
  'zones',
  'insight_body',
  'aim',
  'occasion',
  'insight_why',
  'activity_level',
  'training_days',
  'training_duration',
  'insight_movement',
  'tried',
  'obstacle',
  'insight_obstacle',
  'diet_style',
  'weekend',
  'trigger',
  'insight_habits',
  'with_you',
  'calculating',
  'result',
] as const;

/** English order. Runtime navigation must pass a locale and use quizStepsFor. */
export const QUIZ_STEPS = EN_QUIZ_STEPS;

export type QuizStep = (typeof EN_QUIZ_STEPS)[number] | (typeof VI_QUIZ_STEPS)[number];

export type StepKind = 'question' | 'insight' | 'projection' | 'coaching' | 'loader' | 'plan';

export const VI_STEP_KINDS = {
  goal: 'question',
  sex: 'question',
  age_group: 'question',
  insight_pace: 'insight',
  height: 'question',
  weight: 'question',
  target_weight: 'question',
  progress: 'projection',
  body_current: 'question',
  body_target: 'question',
  zones: 'question',
  insight_body: 'insight',
  aim: 'question',
  occasion: 'question',
  insight_why: 'insight',
  activity_level: 'question',
  training_days: 'question',
  training_duration: 'question',
  insight_movement: 'insight',
  tried: 'question',
  obstacle: 'question',
  insight_obstacle: 'insight',
  diet_style: 'question',
  weekend: 'question',
  trigger: 'question',
  insight_habits: 'insight',
  with_you: 'coaching',
  calculating: 'loader',
  result: 'plan',
} as const satisfies Record<(typeof VI_QUIZ_STEPS)[number], StepKind>;

export type ViChapter = 'you' | 'body' | 'habits' | 'plan';

const VI_CHAPTER_OF = {
  goal: 'you',
  sex: 'you',
  age_group: 'you',
  insight_pace: 'you',
  height: 'body',
  weight: 'body',
  target_weight: 'body',
  progress: 'body',
  body_current: 'body',
  body_target: 'body',
  zones: 'body',
  insight_body: 'body',
  aim: 'habits',
  occasion: 'habits',
  insight_why: 'habits',
  activity_level: 'habits',
  training_days: 'habits',
  training_duration: 'habits',
  insight_movement: 'habits',
  tried: 'habits',
  obstacle: 'habits',
  insight_obstacle: 'habits',
  diet_style: 'habits',
  weekend: 'habits',
  trigger: 'habits',
  insight_habits: 'habits',
  with_you: 'habits',
  calculating: 'plan',
  result: 'plan',
} as const satisfies Record<(typeof VI_QUIZ_STEPS)[number], ViChapter>;

/** Product tour after the calorie result and the email form. The day plan is a quiz screen before that result. */
export const VALUE_TOUR_STEPS = ['snap', 'activity', 'macros', 'sources'] as const;

export type ValueTourStep = (typeof VALUE_TOUR_STEPS)[number];

export function quizStepsFor(locale: Locale): readonly QuizStep[] {
  return locale === 'en' ? EN_QUIZ_STEPS : VI_QUIZ_STEPS;
}

export function onboardingStepCount(locale: Locale = 'vi'): number {
  return quizStepsFor(locale).length + VALUE_TOUR_STEPS.length;
}

/** 1-based position of a value screen on the shared onboarding bar. */
export function valueProgressIndex(step: ValueTourStep, locale: Locale = 'vi'): number {
  return quizStepsFor(locale).length + VALUE_TOUR_STEPS.indexOf(step) + 1;
}

export type QuizChapter = 'intent' | 'body' | 'routine' | 'plan';

export const STEP_CHAPTERS: Record<QuizStep, QuizChapter> = {
  goal: 'intent',
  sex: 'intent',
  age_group: 'intent',
  proof: 'intent',
  insight_pace: 'intent',
  aim: 'intent',
  body_current: 'body',
  body_target: 'body',
  zones: 'body',
  occasion: 'body',
  height: 'body',
  weight: 'body',
  target_weight: 'body',
  progress: 'body',
  insight_body: 'body',
  activity_level: 'routine',
  training_days: 'routine',
  training_duration: 'routine',
  insight_movement: 'routine',
  tried: 'routine',
  obstacle: 'routine',
  insight_obstacle: 'routine',
  diet_style: 'routine',
  weekend: 'routine',
  trigger: 'routine',
  insight_habits: 'routine',
  insight_why: 'routine',
  with_you: 'routine',
  calculating: 'plan',
  day_plan: 'plan',
  result: 'plan',
};

export function viChapter(step: QuizStep): ViChapter {
  if (Object.prototype.hasOwnProperty.call(VI_CHAPTER_OF, step)) {
    return VI_CHAPTER_OF[step as keyof typeof VI_CHAPTER_OF];
  }
  return 'you';
}

/** Screens that ask the visitor something. */
const EN_QUESTION_STEPS: readonly QuizStep[] = [
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

const VI_QUESTION_STEPS: readonly QuizStep[] = EN_QUESTION_STEPS;

const ALL_QUIZ_STEPS = new Set<string>([...EN_QUIZ_STEPS, ...VI_QUIZ_STEPS]);

/** Questions left from this step on, counting the step itself when it asks one. */
export function questionCount(from: QuizStep = 'goal', locale: Locale = 'vi'): number {
  const steps = quizStepsFor(locale);
  const questions = locale === 'en' ? EN_QUESTION_STEPS : VI_QUESTION_STEPS;
  const list = steps as readonly string[];
  const start = list.indexOf(from);
  if (start < 0) return 0;
  return questions.filter((step) => list.indexOf(step) >= start).length;
}

export function isQuizStep(slug: string): slug is QuizStep {
  return ALL_QUIZ_STEPS.has(slug);
}

/** Returns the next in-app screen, or null when the quiz is complete. */
export function nextStep(step: QuizStep, locale: Locale = 'vi'): QuizStep | null {
  const steps = quizStepsFor(locale);
  const i = (steps as readonly string[]).indexOf(step);
  if (i < 0 || i === steps.length - 1) return null;
  return steps[i + 1];
}

/** Returns the previous in-app screen, or null when the landing page precedes it. The loader only plays on the way forward. */
export function previousStep(step: QuizStep, locale: Locale = 'vi'): QuizStep | null {
  const steps = quizStepsFor(locale);
  const i = (steps as readonly string[]).indexOf(step);
  if (i <= 0) return null;
  const previous = steps[i - 1];
  return previous === 'calculating' ? steps[i - 2] ?? null : previous;
}

/** A saved step from the other language lands on the closest screen this language still shows. */
export function nearestQuizStep(step: QuizStep, locale: Locale): QuizStep {
  const target = quizStepsFor(locale);
  if ((target as readonly string[]).includes(step)) return step;
  if (locale === 'vi' && step === 'proof') return 'insight_pace';
  const source = locale === 'en' ? VI_QUIZ_STEPS : EN_QUIZ_STEPS;
  const start = Math.max(0, (source as readonly string[]).indexOf(step));
  for (let i = start; i >= 0; i -= 1) {
    const candidate = source[i];
    if ((target as readonly string[]).includes(candidate)) return candidate;
  }
  return target[0];
}

/** 1-based index for the progress bar. */
export function stepIndex(step: QuizStep, locale: Locale = 'vi'): number {
  const index = (quizStepsFor(locale) as readonly string[]).indexOf(step);
  return index < 0 ? 1 : index + 1;
}
