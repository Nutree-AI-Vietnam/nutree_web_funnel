'use client';

import { useRouter } from 'next/navigation';
import { OptionCard } from '@/components/option-card';
import { PrimaryButton } from '@/components/primary-button';
import { vi } from '@/lib/copy/vi';
import { nextRoute, type QuizStep } from '@/lib/quiz/steps';
import { useQuizStore } from '@/lib/quiz/store';
import type { OnboardingPayload } from '@/lib/quiz/types';
import { cn } from '@/lib/utils';
import { QuizStepFrame } from './quiz-step-frame';

type ArrayField = 'pain_points' | 'dietary_preferences';

export function MultiChoiceStep({
  step,
  field,
  question,
  hint,
  options,
}: {
  step: QuizStep;
  field: ArrayField;
  question: string;
  hint?: string;
  options: ReadonlyArray<{ readonly key: string; readonly label: string; readonly icon?: string }>;
}) {
  const router = useRouter();
  const values = useQuizStore((s) => s.data[field]) ?? [];
  const setData = useQuizStore((s) => s.setData);
  const compact = options.length > 6;
  const twoColumn = field === 'dietary_preferences';

  const toggle = (key: string) => {
    let next = values.includes(key) ? values.filter((v) => v !== key) : [...values, key];
    if (field === 'pain_points') next = next.slice(-2);
    if (field === 'dietary_preferences') {
      next = key === 'none' && !values.includes('none')
        ? ['none']
        : next.filter((v) => v !== 'none').slice(-2);
    }
    setData({ [field]: next } as Partial<OnboardingPayload>);
  };

  return (
    <QuizStepFrame
      title={question}
      hint={hint}
      className={cn(compact ? 'gap-2' : 'gap-3')}
      titleClassName={compact ? 'text-[1.65rem]' : undefined}
    >
      <div className={cn(twoColumn ? 'grid grid-cols-2 gap-2' : 'flex flex-col', compact ? 'gap-2' : 'gap-3')}>
        {options.map((o) => (
          <OptionCard
            key={o.key}
            label={o.label}
            icon={o.icon}
            compact={compact}
            selected={values.includes(o.key)}
            onClick={() => toggle(o.key)}
          />
        ))}
      </div>
      <div className={cn('mt-auto', compact ? 'pt-3' : 'pt-6')}>
        <PrimaryButton disabled={values.length === 0} onClick={() => router.push(nextRoute(step))}>
          {vi.common.continue}
        </PrimaryButton>
      </div>
    </QuizStepFrame>
  );
}
