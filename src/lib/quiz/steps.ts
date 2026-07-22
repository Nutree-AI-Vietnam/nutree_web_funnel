/** Final web funnel order. Keep slugs stable because routes and persisted state use them. */
export const QUIZ_STEPS = [
  'goal',
  'name_ask',
  'challenges',
  'duration',
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
  'support_style',
  'plan_summary',
  'calculating',
  'result',
] as const;

export type QuizStep = (typeof QUIZ_STEPS)[number];
export type QuizChapter = 'intent' | 'body' | 'routine' | 'plan';

export const STEP_CHAPTERS: Record<QuizStep, QuizChapter> = {
  goal: 'intent',
  name_ask: 'intent',
  challenges: 'intent',
  duration: 'intent',
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
  support_style: 'routine',
  plan_summary: 'plan',
  calculating: 'plan',
  result: 'plan',
};

export const CHAPTER_LABELS: Record<QuizChapter, string> = {
  intent: 'Mục tiêu',
  body: 'Cơ thể',
  routine: 'Thói quen',
  plan: 'Kế hoạch',
};

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

export function chapterLabel(step: QuizStep): string {
  return CHAPTER_LABELS[STEP_CHAPTERS[step]];
}
