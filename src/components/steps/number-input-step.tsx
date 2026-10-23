'use client';

import { useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { PrimaryButton } from '@/components/primary-button';
import { useCopy } from '@/lib/copy/use-copy';
import type { Copy } from '@/lib/copy';
import { goToNextQuizStep } from '@/lib/quiz/navigation';
import type { QuizStep } from '@/lib/quiz/steps';
import { useQuizStore } from '@/lib/quiz/store';
import type { OnboardingPayload } from '@/lib/quiz/types';
import type { Measure } from '@/lib/quiz/units';
import { isMetricValueValid, MetricInput, parseMetricDraft } from './metric-input';
import { QuizStepFrame } from './quiz-step-frame';
import { UnitFields } from './unit-fields';

type NumberField = 'target_weight_kg' | 'height_cm' | 'weight_kg' | 'body_fat_percentage';

/** Fields the visitor enters in their own units; the others are plain numbers. */
const UNIT_MEASURES: Partial<Record<NumberField, Measure>> = {
  height_cm: 'height',
  weight_kg: 'weight',
  target_weight_kg: 'weight',
};

type FieldConfig = {
  label: string;
  hint?: string;
  step: number;
  defaultValue?: number;
};

/** Field labels/hints follow the active locale, so rebuild the map from copy. */
function fieldConfigFor(copy: Copy): Record<NumberField, FieldConfig> {
  return {
    target_weight_kg: {
      label: copy.target_weight.label,
      hint: copy.target_weight.hint,
      step: 1,
    },
    height_cm: {
      label: copy.height.heightLabel,
      hint: copy.height.heightHint,
      step: 1,
      defaultValue: 160,
    },
    weight_kg: {
      label: copy.weight.weightLabel,
      hint: copy.weight.weightHint,
      step: 1,
      defaultValue: 50,
    },
    body_fat_percentage: {
      label: copy.body_fat.label,
      hint: copy.body_fat.inputHint,
      step: 0.5,
    },
  };
}

export function NumberInputStep({
  step,
  field,
  question,
  unit,
  min,
  max,
  hint,
  optional = false,
  defaultValue,
  insight,
}: {
  step: QuizStep;
  field: NumberField;
  question: string;
  unit: string;
  min: number;
  max: number;
  hint?: string;
  optional?: boolean;
  /** Start value for a new answer; overrides the field default. */
  defaultValue?: number;
  /** Shown under the field with the value picked so far, in metric. */
  insight?: (metric: number | null) => ReactNode;
}) {
  const router = useRouter();
  const copy = useCopy();
  const saved = useQuizStore((s) => s.data[field]);
  const setData = useQuizStore((s) => s.setData);
  const [touched, setTouched] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const fieldConfig = fieldConfigFor(copy)[field];
  const config = defaultValue != null ? { ...fieldConfig, defaultValue } : fieldConfig;
  const [value, setValue] = useState(saved != null ? String(saved) : config.defaultValue != null ? String(config.defaultValue) : '');
  // What a unit field reports: the metric value, or null while what is typed is not valid.
  const [metric, setMetric] = useState<number | null>(null);
  const measure = UNIT_MEASURES[field];

  const parsed = measure ? metric : parseMetricDraft(value);
  const valid = measure ? metric != null : isMetricValueValid(value, min, max);
  const showError = (touched || attempted) && !valid;
  const error = copy.metric.rangeError(config.label, min, max, unit);

  const submit = () => {
    setAttempted(true);
    if (!valid || parsed == null) return;

    setData({ [field]: parsed } as Partial<OnboardingPayload>);
    goToNextQuizStep(router, step);
  };

  return (
    <QuizStepFrame title={question} hint={hint}>
      <form
        className="quiz-number-form flex h-full min-h-0 flex-1 flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <div className="flex min-h-0 flex-1 flex-col">
        {measure ? (
          <UnitFields
            measure={measure}
            id={`${step}-${field}`}
            label={config.label}
            initialValue={saved ?? config.defaultValue}
            unit={unit}
            min={min}
            max={max}
            autoFocus
            showError={touched || attempted}
            onChange={setMetric}
            onBlur={() => setTouched(true)}
          />
        ) : (
          <MetricInput
            id={`${step}-${field}`}
            label={config.label}
            unit={unit}
            value={value}
            min={min}
            max={max}
            step={config.step}
            autoFocus
            bare
            error={showError ? error : undefined}
            onChange={setValue}
            onBlur={() => setTouched(true)}
          />
        )}
        </div>
        {insight?.(measure ? metric : parsed)}
        <div className="quiz-number-actions flex shrink-0 flex-col gap-3 pt-4">
          <PrimaryButton type="submit">{copy.common.continue}</PrimaryButton>
          {optional && (
            <button
              type="button"
              onClick={() => {
                setData({ [field]: undefined } as Partial<OnboardingPayload>);
                goToNextQuizStep(router, step);
              }}
              className="min-h-11 py-2 text-sm font-medium text-muted-brand transition hover:text-slate-brand focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-brand"
            >
              {copy.common.skip}
            </button>
          )}
        </div>
      </form>
    </QuizStepFrame>
  );
}
