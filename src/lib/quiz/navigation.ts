import { SKIP_LANDING } from '@/lib/funnel/skip-landing';
import { useQuizStore } from './store';
import { nextStep, previousStep, type QuizStep } from './steps';

type QuizRouter = {
  push: (href: string) => void;
  replace: (href: string) => void;
};

const QUIZ_LAST_INDEX_KEY = 'quiz:lastIndex';

function showQuizStep(router: QuizRouter, step: QuizStep): void {
  useQuizStore.getState().setCurrentStep(step);
  useQuizStore.getState().setFunnelScreen('quiz');
}

/**
 * Same sequence as the landing call to action: drop saved answers, clear the
 * old step index, and open the goal step.
 */
export function startQuizFromLanding(): void {
  const { reset, setFunnelScreen } = useQuizStore.getState();
  reset();
  try {
    globalThis.sessionStorage?.removeItem(QUIZ_LAST_INDEX_KEY);
  } catch {
    // The quiz still starts when session storage is blocked.
  }
  setFunnelScreen('quiz');
}

/** Where leaving the quiz used to open the landing screen. */
export function returnToFunnelStart(): void {
  if (SKIP_LANDING) {
    startQuizFromLanding();
    return;
  }
  useQuizStore.getState().setFunnelScreen('landing');
}

export function goToQuizStep(router: QuizRouter, step: QuizStep): void {
  showQuizStep(router, step);
}

export function goToNextQuizStep(router: QuizRouter, step: QuizStep): void {
  const next = nextStep(step);
  if (next) {
    showQuizStep(router, next);
  } else {
    useQuizStore.getState().setFunnelScreen('email');
  }
}

export function goToPreviousQuizStep(router: QuizRouter, step: QuizStep): void {
  const previous = previousStep(step);
  if (previous) {
    showQuizStep(router, previous);
  } else {
    returnToFunnelStart();
  }
}
