'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PrimaryButton } from '@/components/primary-button';
import { vi } from '@/lib/copy/vi';
import { nextRoute, type QuizStep } from '@/lib/quiz/steps';
import { useQuizStore } from '@/lib/quiz/store';
import type { OnboardingPayload } from '@/lib/quiz/types';

type NumberField = 'target_weight_kg' | 'age' | 'body_fat_percentage';

export function NumberInputStep({
  step,
  field,
  question,
  unit,
  min,
  max,
  hint,
  optional = false,
}: {
  step: QuizStep;
  field: NumberField;
  question: string;
  unit: string;
  min: number;
  max: number;
  hint?: string;
  optional?: boolean;
}) {
  const router = useRouter();
  const saved = useQuizStore((s) => s.data[field]);
  const setData = useQuizStore((s) => s.setData);
  const [value, setValue] = useState(saved != null ? String(saved) : '');

  const parsed = Number(value);
  const valid = value !== '' && Number.isFinite(parsed) && parsed >= min && parsed <= max;

  const submit = () => {
    setData({ [field]: parsed } as Partial<OnboardingPayload>);
    router.push(nextRoute(step));
  };

  return (
    <div className="flex flex-1 flex-col gap-4">
      <h1 className="text-2xl font-bold text-forest">{question}</h1>
      {hint && <p className="text-sm text-muted-brand">{hint}</p>}
      <div className="flex items-center gap-3">
        <input
          type="number"
          inputMode="decimal"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && valid && submit()}
          min={min}
          max={max}
          autoFocus
          className="w-40 rounded-2xl border-2 border-border-brand bg-white px-5 py-4 text-center text-2xl font-bold outline-none focus:border-teal-brand"
        />
        <span className="text-lg text-muted-brand">{unit}</span>
      </div>
      <div className="mt-auto flex flex-col gap-3 pt-6">
        <PrimaryButton disabled={!valid} onClick={submit}>
          {vi.common.continue}
        </PrimaryButton>
        {optional && (
          <button
            type="button"
            onClick={() => {
              setData({ [field]: undefined } as Partial<OnboardingPayload>);
              router.push(nextRoute(step));
            }}
            className="py-2 text-sm font-medium text-muted-brand hover:text-slate-brand"
          >
            {vi.common.skip}
          </button>
        )}
      </div>
    </div>
  );
}
