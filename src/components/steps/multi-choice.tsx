'use client';

import { useRouter } from 'next/navigation';
import { OptionCard } from '@/components/option-card';
import { PrimaryButton } from '@/components/primary-button';
import { vi } from '@/lib/copy/vi';
import { nextRoute, type QuizStep } from '@/lib/quiz/steps';
import { useQuizStore } from '@/lib/quiz/store';
import type { OnboardingPayload } from '@/lib/quiz/types';

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
  options: ReadonlyArray<{ readonly key: string; readonly label: string }>;
}) {
  const router = useRouter();
  const values = useQuizStore((s) => s.data[field]) ?? [];
  const setData = useQuizStore((s) => s.setData);

  const toggle = (key: string) => {
    const next = values.includes(key) ? values.filter((v) => v !== key) : [...values, key];
    setData({ [field]: next } as Partial<OnboardingPayload>);
  };

  return (
    <div className="flex flex-1 flex-col gap-3">
      <h1 className="text-2xl font-bold text-forest">{question}</h1>
      {hint && <p className="mb-2 text-sm text-muted-brand">{hint}</p>}
      <div className="flex flex-col gap-3">
        {options.map((o) => (
          <OptionCard
            key={o.key}
            label={o.label}
            selected={values.includes(o.key)}
            onClick={() => toggle(o.key)}
          />
        ))}
      </div>
      <div className="mt-auto pt-6">
        <PrimaryButton disabled={values.length === 0} onClick={() => router.push(nextRoute(step))}>
          {vi.common.continue}
        </PrimaryButton>
      </div>
    </div>
  );
}
