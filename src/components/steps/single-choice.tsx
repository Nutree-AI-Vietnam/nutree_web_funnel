'use client';

import { useEffect, useRef, useState } from 'react';
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
  // Show the selection, then advance — feedback before navigation feels responsive.
  const [pending, setPending] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const choose = (key: string) => {
    if (pending) return;
    setData({ [field]: key } as Partial<OnboardingPayload>);
    setPending(key);
    timerRef.current = setTimeout(() => router.push(nextRoute(step)), 240);
  };

  return (
    <QuizStepFrame title={question} className="gap-3">
      {options.map((o) => (
        <OptionCard
          key={o.key}
          label={o.label}
          icon={o.icon}
          selected={pending ? pending === o.key : value === o.key}
          onClick={() => choose(o.key)}
        />
      ))}
    </QuizStepFrame>
  );
}
