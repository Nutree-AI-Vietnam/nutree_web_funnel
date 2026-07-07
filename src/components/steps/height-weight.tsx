'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PrimaryButton } from '@/components/primary-button';
import { vi } from '@/lib/copy/vi';
import { nextRoute } from '@/lib/quiz/steps';
import { useQuizStore } from '@/lib/quiz/store';

export function HeightWeightStep() {
  const router = useRouter();
  const data = useQuizStore((s) => s.data);
  const setData = useQuizStore((s) => s.setData);
  const [height, setHeight] = useState(data.height_cm != null ? String(data.height_cm) : '');
  const [weight, setWeight] = useState(data.weight_kg != null ? String(data.weight_kg) : '');

  const h = Number(height);
  const w = Number(weight);
  const valid =
    Number.isFinite(h) &&
    h >= 100 &&
    h <= 250 &&
    Number.isFinite(w) &&
    w >= 30 &&
    w <= 250;

  const field = (label: string, value: string, onChange: (v: string) => void) => (
    <label className="flex flex-col gap-2">
      <span className="text-sm font-medium text-slate-brand">{label}</span>
      <input
        type="number"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-2xl border-2 border-border-brand bg-white px-5 py-4 text-xl font-bold outline-none focus:border-teal-brand"
      />
    </label>
  );

  return (
    <div className="flex flex-1 flex-col gap-4">
      <h1 className="text-2xl font-bold text-forest">{vi.height_weight.question}</h1>
      <div className="grid grid-cols-2 gap-4">
        {field(vi.height_weight.heightLabel, height, setHeight)}
        {field(vi.height_weight.weightLabel, weight, setWeight)}
      </div>
      <div className="mt-auto pt-6">
        <PrimaryButton
          disabled={!valid}
          onClick={() => {
            setData({ height_cm: h, weight_kg: w });
            router.push(nextRoute('height_weight'));
          }}
        >
          {vi.common.continue}
        </PrimaryButton>
      </div>
    </div>
  );
}
