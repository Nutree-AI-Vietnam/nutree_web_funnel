import { SKIP_LANDING } from '@/lib/funnel/skip-landing';
import { savedTargetFits } from './healthy-weight';
import { useQuizStore } from './store';
import { nextStep, previousStep, type QuizStep } from './steps';
import { missingTrainingStep } from './training';
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
  clearReturnAfterTraining();
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
    // The day plan is shown after the email, so the last quiz screen opens the email form.
    useQuizStore.getState().setFunnelScreen('email');
  }
}

export function goToPreviousQuizStep(router: QuizRouter, step: QuizStep): void {
  const { editReturn, setEditReturn } = useQuizStore.getState();
  if (editReturn) {
    setEditReturn(null);
    showQuizStep(router, editReturn);
    return;
  }
  let previous = previousStep(step);
  if (previous === 'training_duration' && useQuizStore.getState().data.training_days_per_week === 0) {
    previous = 'training_days';
  }
  if (previous) {
    showQuizStep(router, previous);
  } else {
    returnToFunnelStart();
  }
}

const RETURN_AFTER_TRAINING_KEY = 'quiz:returnAfterTraining';

function clearReturnAfterTraining(): void {
  try {
    globalThis.sessionStorage?.removeItem(RETURN_AFTER_TRAINING_KEY);
  } catch {
    // The quiz still continues when session storage is blocked.
  }
}

/**
 * Email cannot be saved until training days (and session length, when they train)
 * are answered. A visitor who already reached email is sent to the missing screen
 * and brought back, instead of walking the rest of the quiz again.
 */
export function requireTrainingBeforeEmail(): boolean {
  const missing = missingTrainingStep(useQuizStore.getState().data);
  if (!missing) {
    clearReturnAfterTraining();
    return true;
  }
  try {
    globalThis.sessionStorage?.setItem(RETURN_AFTER_TRAINING_KEY, 'email');
  } catch {
    // Still ask the question in this tab.
  }
  useQuizStore.getState().setCurrentStep(missing);
  useQuizStore.getState().setFunnelScreen('quiz');
  return false;
}

/** After a training answer: back to email when that screen sent them here, otherwise the next quiz step. */
export function continueAfterTrainingAnswer(router: QuizRouter, from: QuizStep): void {
  let returnToEmail = false;
  try {
    returnToEmail = globalThis.sessionStorage?.getItem(RETURN_AFTER_TRAINING_KEY) === 'email';
  } catch {
    returnToEmail = false;
  }
  if (returnToEmail && missingTrainingStep(useQuizStore.getState().data) == null) {
    clearReturnAfterTraining();
    useQuizStore.getState().setFunnelScreen('email');
    return;
  }
  goToNextQuizStep(router, from);
}
