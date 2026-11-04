import type { Locale } from '@/lib/copy';
import {
  isLoaderStep,
  VI_QUIZ_STEPS,
  VI_SURVEY,
  viChapter as viChapterOf,
  viQuizChapter,
  type StepKind,
  type ViChapter,
  type ViQuizStep,
} from './vi-survey';

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

export { VI_QUIZ_STEPS, VI_SURVEY };

/** English order. Runtime navigation must pass a locale and use quizStepsFor. */
export const QUIZ_STEPS = EN_QUIZ_STEPS;

export type QuizStep = (typeof EN_QUIZ_STEPS)[number] | ViQuizStep;

export type { StepKind, ViChapter };

export const VI_STEP_KINDS = Object.fromEntries(VI_SURVEY.map((entry) => [entry.id, entry.kind])) as Record<ViQuizStep, StepKind>;

/** Product tour after the calorie result and the email form. The day plan is a quiz screen before that result. */
export const VALUE_TOUR_STEPS = ['snap', 'activity', 'macros', 'sources'] as const;

export type ValueTourStep = (typeof VALUE_TOUR_STEPS)[number];

export function quizStepsFor(locale: Locale): readonly QuizStep[] {
  return locale === 'en' ? EN_QUIZ_STEPS : VI_QUIZ_STEPS;
}

export function onboardingStepCount(locale: Locale): number {
  return quizStepsFor(locale).length + VALUE_TOUR_STEPS.length;
}

/** 1-based position of a value screen on the shared onboarding bar. */
export function valueProgressIndex(step: ValueTourStep, locale: Locale): number {
  return quizStepsFor(locale).length + VALUE_TOUR_STEPS.indexOf(step) + 1;
}

export function lastQuizStep(locale: Locale): QuizStep {
  const steps = quizStepsFor(locale);
  return steps[steps.length - 1];
}

export type QuizChapter = 'intent' | 'body' | 'routine' | 'plan';

const EN_CHAPTERS: Record<(typeof EN_QUIZ_STEPS)[number], QuizChapter> = {
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
  day_plan: 'plan',
  result: 'plan',
};

export const STEP_CHAPTERS = Object.fromEntries(
  [...new Set<QuizStep>([...EN_QUIZ_STEPS, ...VI_QUIZ_STEPS])].map((step) => [
    step,
    step in EN_CHAPTERS ? EN_CHAPTERS[step as keyof typeof EN_CHAPTERS] : viQuizChapter(step),
  ]),
) as Record<QuizStep, QuizChapter>;

export function viChapter(step: QuizStep): ViChapter {
  return viChapterOf(step);
}

/** Screens that ask the visitor something, on the English survey. */
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

const VI_QUESTION_STEPS: readonly QuizStep[] = VI_SURVEY.filter((entry) => entry.kind === 'question').map((entry) => entry.id);

const ALL_QUIZ_STEPS = new Set<string>([...EN_QUIZ_STEPS, ...VI_QUIZ_STEPS]);

/** Questions left from this step on, counting the step itself when it asks one. */
export function questionCount(from: QuizStep, locale: Locale): number {
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
export function nextStep(step: QuizStep, locale: Locale): QuizStep | null {
  const steps = quizStepsFor(locale);
  const i = (steps as readonly string[]).indexOf(step);
  if (i < 0 || i === steps.length - 1) return null;
  return steps[i + 1];
}

/** Returns the previous in-app screen, or null when the landing page precedes it. Loaders only play on the way forward. */
export function previousStep(step: QuizStep, locale: Locale): QuizStep | null {
  const steps = quizStepsFor(locale);
  let i = (steps as readonly string[]).indexOf(step) - 1;
  while (i >= 0 && isLoaderStep(steps[i])) i -= 1;
  return i >= 0 ? steps[i] : null;
}

/** A saved step from the other language lands on the closest screen this language still shows. */
export function nearestQuizStep(step: QuizStep, locale: Locale): QuizStep {
  const target = quizStepsFor(locale);
  if ((target as readonly string[]).includes(step)) return step;
  if (locale === 'vi' && step === 'proof') return 'with_you';
  const source = locale === 'en' ? VI_QUIZ_STEPS : EN_QUIZ_STEPS;
  const start = Math.max(0, (source as readonly string[]).indexOf(step));
  for (let i = start; i >= 0; i -= 1) {
    const candidate = source[i];
    if ((target as readonly string[]).includes(candidate)) return candidate;
  }
  return target[0];
}

/** 1-based index for the progress bar. */
export function stepIndex(step: QuizStep, locale: Locale): number {
  const index = (quizStepsFor(locale) as readonly string[]).indexOf(step);
  return index < 0 ? 1 : index + 1;
}
