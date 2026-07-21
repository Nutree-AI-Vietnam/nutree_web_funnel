'use client';

import { useRouter } from 'next/navigation';
import { OptionCard } from '@/components/option-card';
import { PrimaryButton } from '@/components/primary-button';
import { vi } from '@/lib/copy/vi';
import { nextRoute, type QuizStep } from '@/lib/quiz/steps';
import { useQuizStore } from '@/lib/quiz/store';
import type { OnboardingPayload } from '@/lib/quiz/types';
import { cn } from '@/lib/utils';

type ArrayField = 'pain_points' | 'referral_sources' | 'training_types' | 'dietary_preferences';

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
  const twoColumn = field === 'training_types';

  const toggle = (key: string) => {
    const next = values.includes(key) ? values.filter((v) => v !== key) : [...values, key];
    setData({ [field]: next } as Partial<OnboardingPayload>);
  };

  return (
    <div className={cn('flex flex-1 flex-col', compact ? 'gap-2' : 'gap-3')}>
      <h1 className={cn('font-bold text-forest', compact ? 'text-[1.65rem] leading-tight' : 'text-2xl')}>
        {question}
      </h1>
      {hint && <p className={cn('text-sm text-muted-brand', compact ? 'mb-0' : 'mb-2')}>{hint}</p>}
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
    </div>
  );
}
