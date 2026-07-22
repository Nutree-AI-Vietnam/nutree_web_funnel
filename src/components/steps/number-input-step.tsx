'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PrimaryButton } from '@/components/primary-button';
import { vi } from '@/lib/copy/vi';
import { nextRoute, type QuizStep } from '@/lib/quiz/steps';
import { useQuizStore } from '@/lib/quiz/store';
import type { OnboardingPayload } from '@/lib/quiz/types';
import { isMetricValueValid, MetricInput, parseMetricDraft } from './metric-input';
import { QuizStepFrame } from './quiz-step-frame';

type NumberField = 'target_weight_kg' | 'height_cm' | 'weight_kg' | 'age' | 'body_fat_percentage';

const fieldConfig: Record<
  NumberField,
  {
    label: string;
    hint?: string;
    step: number;
    defaultValue: number;
  }
> = {
  target_weight_kg: {
    label: vi.target_weight.label,
    hint: vi.target_weight.hint,
    step: 1,
    defaultValue: 50,
  },
  height_cm: {
    label: vi.height.heightLabel,
    hint: vi.height.heightHint,
    step: 1,
    defaultValue: 170,
  },
  weight_kg: {
    label: vi.weight.weightLabel,
    hint: vi.weight.weightHint,
    step: 0.5,
    defaultValue: 50,
  },
  age: {
    label: vi.age.label,
    hint: vi.age.hint,
    step: 1,
    defaultValue: 30,
  },
  body_fat_percentage: {
    label: vi.body_fat.label,
    hint: vi.body_fat.inputHint,
    step: 0.5,
    defaultValue: 20,
  },
};

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
  const [touched, setTouched] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const config = fieldConfig[field];
  const [value, setValue] = useState(saved != null ? String(saved) : String(config.defaultValue));

  const parsed = parseMetricDraft(value);
  const valid = isMetricValueValid(value, min, max);
  const showError = (touched || attempted) && !valid;
  const error = vi.metric.rangeError(config.label, min, max, unit);

  const submit = () => {
    setAttempted(true);
    if (!valid || parsed == null) return;

    setData({ [field]: parsed } as Partial<OnboardingPayload>);
    router.push(nextRoute(step));
  };

  return (
    <QuizStepFrame title={question} hint={hint}>
      <form
        className="flex flex-1 flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <MetricInput
          id={`${step}-${field}`}
          label={config.label}
          unit={unit}
          value={value}
          min={min}
          max={max}
          step={config.step}
          hint={hint ?? config.hint}
          autoFocus
          error={showError ? error : undefined}
          onChange={setValue}
          onBlur={() => setTouched(true)}
        />
        <div className="mt-auto flex flex-col gap-3 pt-6">
          <PrimaryButton type="submit">{vi.common.continue}</PrimaryButton>
          {optional && (
            <button
              type="button"
              onClick={() => {
                setData({ [field]: undefined } as Partial<OnboardingPayload>);
                router.push(nextRoute(step));
              }}
              className="min-h-11 py-2 text-sm font-medium text-muted-brand transition hover:text-slate-brand focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-brand"
            >
              {vi.common.skip}
            </button>
          )}
        </div>
      </form>
    </QuizStepFrame>
  );
}
