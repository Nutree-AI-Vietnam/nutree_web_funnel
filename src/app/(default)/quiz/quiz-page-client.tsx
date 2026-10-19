'use client';

import { QuizShell } from '@/components/quiz-shell';
import { useHydrated, useQuizStore } from '@/lib/quiz/store';
import { StepRenderer } from './step-renderer';

export function QuizPageClient() {
  const hydrated = useHydrated();
  const currentStep = useQuizStore((state) => state.currentStep);

  if (!hydrated) return null;

  return (
    <QuizShell step={currentStep}>
      <StepRenderer step={currentStep} />
    </QuizShell>
  );
}
