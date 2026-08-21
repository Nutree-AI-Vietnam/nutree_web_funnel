import { useQuizStore } from './store';
import { nextStep, previousStep, type QuizStep } from './steps';

type QuizRouter = {
  push: (href: string) => void;
  replace: (href: string) => void;
};

function showQuizStep(router: QuizRouter, step: QuizStep): void {
  useQuizStore.getState().setCurrentStep(step);
  useQuizStore.getState().setFunnelScreen('quiz');
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
    useQuizStore.getState().setFunnelScreen('landing');
  }
}
