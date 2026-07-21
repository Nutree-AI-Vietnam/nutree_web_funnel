'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PrimaryButton } from '@/components/primary-button';
import { vi } from '@/lib/copy/vi';
import { nextRoute } from '@/lib/quiz/steps';
import { useQuizStore } from '@/lib/quiz/store';
import { isMetricValueValid, MetricInput, parseMetricDraft } from './metric-input';

export function HeightWeightStep() {
  const router = useRouter();
  const data = useQuizStore((s) => s.data);
  const setData = useQuizStore((s) => s.setData);
  const [height, setHeight] = useState(data.height_cm != null ? String(data.height_cm) : '');
  const [weight, setWeight] = useState(data.weight_kg != null ? String(data.weight_kg) : '');
  const [touched, setTouched] = useState({ height: false, weight: false });
  const [attempted, setAttempted] = useState(false);

  const h = parseMetricDraft(height);
  const w = parseMetricDraft(weight);
  const heightValid = isMetricValueValid(height, 100, 250);
  const weightValid = isMetricValueValid(weight, 30, 250);
  const valid = heightValid && weightValid;

  const submit = () => {
    setAttempted(true);
    if (!valid || h == null || w == null) return;

    setData({ height_cm: h, weight_kg: w });
    router.push(nextRoute('height_weight'));
  };

  return (
    <div className="flex flex-1 flex-col gap-4">
      <h1 className="text-2xl font-bold text-forest">{vi.height_weight.question}</h1>
      <form
        className="flex flex-1 flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <MetricInput
            id="height-cm"
            label={vi.height_weight.heightLabel}
            unit={vi.height_weight.heightUnit}
            value={height}
            min={100}
            max={250}
            step={1}
            hint={vi.height_weight.heightHint}
            autoFocus
            error={
              (touched.height || attempted) && !heightValid
                ? vi.metric.rangeError(
                    vi.height_weight.heightLabel,
                    100,
                    250,
                    vi.height_weight.heightUnit,
                  )
                : undefined
            }
            onChange={setHeight}
            onBlur={() => setTouched((current) => ({ ...current, height: true }))}
          />
          <MetricInput
            id="weight-kg"
            label={vi.height_weight.weightLabel}
            unit={vi.height_weight.weightUnit}
            value={weight}
            min={30}
            max={250}
            step={0.5}
            hint={vi.height_weight.weightHint}
            error={
              (touched.weight || attempted) && !weightValid
                ? vi.metric.rangeError(
                    vi.height_weight.weightLabel,
                    30,
                    250,
                    vi.height_weight.weightUnit,
                  )
                : undefined
            }
            quickAdjustments={[
              { label: '-2.5 kg', amount: -2.5 },
              { label: '+2.5 kg', amount: 2.5 },
            ]}
            onChange={setWeight}
            onBlur={() => setTouched((current) => ({ ...current, weight: true }))}
          />
        </div>
        <div className="mt-auto pt-6">
          <PrimaryButton type="submit">{vi.common.continue}</PrimaryButton>
        </div>
      </form>
    </div>
  );
}
