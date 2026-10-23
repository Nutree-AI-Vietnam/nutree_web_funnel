'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { OptionCard } from '@/components/option-card';
import { goToNextQuizStep } from '@/lib/quiz/navigation';
import type { QuizStep } from '@/lib/quiz/steps';
import { useHydrated, useQuizStore } from '@/lib/quiz/store';
import type { OnboardingPayload } from '@/lib/quiz/types';
import { QuizStepFrame } from './quiz-step-frame';

export function SingleChoiceStep<K extends keyof OnboardingPayload>({
  step,
  field,
  question,
  description,
  options,
  eyebrow,
  hints,
  large = false,
}: {
  step: QuizStep;
  field: K;
  question: string;
  description?: string;
  options: ReadonlyArray<{ readonly key: string; readonly label: string; readonly icon?: string }>;
  eyebrow?: string;
  /** Second line per option key. */
  hints?: Readonly<Record<string, string>>;
  large?: boolean;
}) {
  const router = useRouter();
  const hydrated = useHydrated();
  const stored = useQuizStore((s) => s.data[field]);
  // Saved answers are tab-only. Ignore them until hydration so the server HTML matches.
  const value = hydrated ? stored : undefined;
  const setData = useQuizStore((s) => s.setData);
  // Show the selection, then advance so feedback lands before navigation.
  const [pending, setPending] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const choose = (key: string) => {
    if (pending) return;
    setData({ [field]: key } as Partial<OnboardingPayload>);
    setPending(key);
    timerRef.current = setTimeout(() => goToNextQuizStep(router, step), 240);
  };

  return (
    <QuizStepFrame title={question} description={description} eyebrow={eyebrow} className="gap-3">
      <div className={large ? 'flex flex-col gap-3' : 'flex flex-col gap-2.5'}>
        {options.map((o) => (
          <OptionCard
            key={o.key}
            label={o.label}
            icon={o.icon}
            hint={hints?.[o.key]}
            large={large}
            selected={pending ? pending === o.key : value === o.key}
            onClick={() => choose(o.key)}
          />
        ))}
      </div>
    </QuizStepFrame>
  );
}
