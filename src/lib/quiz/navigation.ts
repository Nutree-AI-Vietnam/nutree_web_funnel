import { SKIP_LANDING } from '@/lib/funnel/skip-landing';
import { savedTargetFits } from './healthy-weight';
import { useQuizStore } from './store';
import { nextStep, previousStep, type QuizStep } from './steps';
import { resolveUnitSystem } from './units';

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

/** Opens one answer from the review screen. Its Continue, and Back, come straight back to the review. */
export function editQuizAnswer(router: QuizRouter, step: QuizStep): void {
  const { currentStep, setEditReturn } = useQuizStore.getState();
  setEditReturn(currentStep);
  showQuizStep(router, step);
}

/** Whether the saved target weight still fits the answers, in the units the visitor reads. */
function savedTargetStillFits(): boolean {
  const { data, units, locale, countryCode } = useQuizStore.getState();
  return savedTargetFits(data, resolveUnitSystem(units, locale, countryCode));
}

export function goToNextQuizStep(router: QuizRouter, step: QuizStep): void {
  const { editReturn, setEditReturn } = useQuizStore.getState();
  if (editReturn) {
    // A changed goal or body answer can leave the saved target where its screen would refuse it: ask it again first.
    if (step !== 'target_weight' && !savedTargetStillFits()) {
      showQuizStep(router, 'target_weight');
      return;
    }
    setEditReturn(null);
    showQuizStep(router, editReturn);
    return;
  }
  const next = nextStep(step);
  if (next) {
    showQuizStep(router, next);
  } else {
    useQuizStore.getState().setFunnelScreen('email');
  }
}

export function goToPreviousQuizStep(router: QuizRouter, step: QuizStep): void {
  const { editReturn, setEditReturn, data } = useQuizStore.getState();
  if (editReturn) {
    setEditReturn(null);
    showQuizStep(router, editReturn);
    return;
  }
  const previous = previousStep(step);
  if (previous) {
    // With no training days the session-length question was skipped on the way in.
    showQuizStep(router, previous === 'training_duration' && data.training_days_per_week === 0 ? 'training_days' : previous);
  } else {
    returnToFunnelStart();
  }
}
