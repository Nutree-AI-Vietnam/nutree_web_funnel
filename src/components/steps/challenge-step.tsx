'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { OptionCard } from '@/components/option-card';
import { useCopy } from '@/lib/copy/use-copy';
import { goToNextQuizStep } from '@/lib/quiz/navigation';
import { useQuizStore } from '@/lib/quiz/store';
import { QuizStepFrame } from './quiz-step-frame';

/** One tap, one blocker. The longer checklist was where people left. */
const OFFERED = ['no_time', 'cant_stick_to_diet', 'stress_eating'] as const;

export function ChallengeStep() {
  const c = useCopy();
  const router = useRouter();
  const setData = useQuizStore((s) => s.setData);
  const [pending, setPending] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const options = [
    ...OFFERED.flatMap((key) => {
      const option = c.challenges.options.find((item) => item.key === key);
      return option ? [option] : [];
    }),
    { key: 'none', label: c.challenges.none },
  ];

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const choose = (key: string) => {
    if (pending) return;
    setPending(key);
    setData({ pain_points: key === 'none' ? [] : [key] });
    timerRef.current = setTimeout(() => goToNextQuizStep(router, 'challenges'), 240);
  };

  return (
    <QuizStepFrame title={c.challenges.question} className="gap-3">
      <div className="flex flex-col gap-2.5">
        {options.map((option) => (
          <OptionCard
            key={option.key}
            label={option.label}
            plain
            selected={pending === option.key}
            onClick={() => choose(option.key)}
          />
        ))}
      </div>
    </QuizStepFrame>
  );
}
