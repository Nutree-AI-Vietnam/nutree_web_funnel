'use client';

import { useRouter } from 'next/navigation';
import { OptionCard } from '@/components/option-card';
import { nextRoute, type QuizStep } from '@/lib/quiz/steps';
import { useQuizStore } from '@/lib/quiz/store';
import type { OnboardingPayload } from '@/lib/quiz/types';
import { QuizStepFrame } from './quiz-step-frame';

export function SingleChoiceStep<K extends keyof OnboardingPayload>({
  step,
  field,
  question,
  options,
}: {
  step: QuizStep;
  field: K;
  question: string;
  options: ReadonlyArray<{ readonly key: string; readonly label: string; readonly icon?: string }>;
}) {
  const router = useRouter();
  const value = useQuizStore((s) => s.data[field]);
  const setData = useQuizStore((s) => s.setData);

  return (
    <QuizStepFrame title={question} className="gap-3">
      {options.map((o) => (
        <OptionCard
          key={o.key}
          label={o.label}
          icon={o.icon}
          selected={value === o.key}
          onClick={() => {
            setData({ [field]: o.key } as Partial<OnboardingPayload>);
            router.push(nextRoute(step));
          }}
        />
      ))}
    </QuizStepFrame>
  );
}
