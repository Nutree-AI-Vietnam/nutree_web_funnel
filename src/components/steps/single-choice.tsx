'use client';

import { useRouter } from 'next/navigation';
import { OptionCard } from '@/components/option-card';
import { nextRoute, type QuizStep } from '@/lib/quiz/steps';
import { useQuizStore } from '@/lib/quiz/store';
import type { OnboardingPayload } from '@/lib/quiz/types';

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
    <div className="flex flex-col gap-3">
      <h1 className="mb-4 text-2xl font-bold text-forest">{question}</h1>
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
    </div>
  );
}
