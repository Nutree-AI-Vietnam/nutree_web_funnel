'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { OptionCard } from '@/components/option-card';
import { PrimaryButton } from '@/components/primary-button';
import { useCopy } from '@/lib/copy/use-copy';
import { goToNextQuizStep } from '@/lib/quiz/navigation';
import { useQuizStore } from '@/lib/quiz/store';
import type { OnboardingPayload } from '@/lib/quiz/types';
import { QuizStepFrame } from './quiz-step-frame';

type Zone = NonNullable<OnboardingPayload['target_zones']>[number];

/** Several zones, then one continue. A choice turns the button on. */
export function ZonesStep() {
  const copy = useCopy();
  const router = useRouter();
  const setData = useQuizStore((state) => state.setData);
  const [picked, setPicked] = useState<Zone[]>([]);

  const toggle = (key: Zone) => {
    setPicked((current) => current.includes(key) ? current.filter((item) => item !== key) : [...current, key]);
  };

  return (
    <QuizStepFrame title={copy.zones.question} className="gap-3">
      <div className="flex flex-col gap-2.5">
        {copy.zones.options.map((option) => {
          const key = option.key as Zone;
          return (
            <OptionCard
              key={option.key}
              label={option.label}
              selected={picked.includes(key)}
              onClick={() => toggle(key)}
            />
          );
        })}
      </div>
      <div className="mt-auto pt-4">
        <PrimaryButton
          disabled={picked.length === 0}
          onClick={() => {
            setData({ target_zones: picked });
            goToNextQuizStep(router, 'zones');
          }}
        >
          {copy.zones.cta}
        </PrimaryButton>
      </div>
    </QuizStepFrame>
  );
}
