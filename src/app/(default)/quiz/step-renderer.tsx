'use client';

import { STEP_COMPONENTS } from '@/components/steps/registry';
import type { QuizStep } from '@/lib/quiz/steps';

export function StepRenderer({ step }: { step: QuizStep }) {
  const Component = STEP_COMPONENTS[step];
  return <Component />;
}
