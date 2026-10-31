'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCopy } from '@/lib/copy/use-copy';
import { goToNextQuizStep } from '@/lib/quiz/navigation';
import { useQuizStore } from '@/lib/quiz/store';
import type { OnboardingPayload } from '@/lib/quiz/types';
import { cn } from '@/lib/utils';
import { QuizStepFrame } from './quiz-step-frame';

type AgeGroup = NonNullable<OnboardingPayload['age_group']>;

/** Illustrated age cards. Exact age is still asked later for the calorie math. */
export function AgeGroupStep() {
  const copy = useCopy();
  const router = useRouter();
  const setData = useQuizStore((state) => state.setData);
  const [pending, setPending] = useState<AgeGroup | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const choose = (key: AgeGroup) => {
    if (pending) return;
    setPending(key);
    setData({ age_group: key });
    timerRef.current = setTimeout(() => goToNextQuizStep(router, 'age_group'), 240);
  };

  return (
    <QuizStepFrame title={copy.ageGroup.question} className="gap-3">
      <div className="grid grid-cols-2 gap-3">
        {copy.ageGroup.options.map((option) => {
          const selected = pending === option.key;
          return (
            <button
              key={option.key}
              type="button"
              aria-pressed={selected}
              onClick={() => choose(option.key as AgeGroup)}
              className={cn(
                'overflow-hidden rounded-[1.4rem] bg-white text-center shadow-[0_8px_18px_rgb(23_69_58_/_0.08)] transition focus:outline-none focus-visible:ring-4 focus-visible:ring-teal-brand/25 active:scale-[0.98]',
                selected && 'ring-2 ring-forest',
              )}
            >
              <Image src={option.image} alt="" width={320} height={320} className="aspect-square w-full object-cover" />
              <span className="block px-2 py-3 text-[1.05rem] font-extrabold text-forest">{option.label}</span>
            </button>
          );
        })}
      </div>
    </QuizStepFrame>
  );
}
