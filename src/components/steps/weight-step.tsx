'use client';

import { useCopy, useLocale } from '@/lib/copy/use-copy';
import { useQuizStore } from '@/lib/quiz/store';
import { bmi, bmiCategory } from '@/lib/tdee/insights';
import { NumberInputStep } from './number-input-step';

/** Start the English wheel near a typical adult (about 159 lb); Vietnam keeps its own default. */
const ENGLISH_DEFAULT_WEIGHT_KG = 72;

export function WeightStep() {
  const copy = useCopy();
  const locale = useLocale();
  const heightCm = useQuizStore((state) => state.data.height_cm);

  return (
    <NumberInputStep
      step="weight"
      field="weight_kg"
      question={copy.weight.question}
      hint={copy.weight.description}
      unit={copy.weight.weightUnit}
      min={30}
      max={250}
      defaultValue={locale === 'en' ? ENGLISH_DEFAULT_WEIGHT_KG : undefined}
      insight={(weightKg) => {
        if (weightKg == null || !heightCm) return null;
        const value = bmi(weightKg, heightCm);
        return (
          <p aria-live="polite" className="mx-auto shrink-0 rounded-full bg-white/86 px-4 py-1.5 text-center text-sm font-extrabold text-forest shadow-sm">
            {copy.funnel.weightBmi(value.toFixed(1), copy.funnel.bmiCategory[bmiCategory(value)])}
          </p>
        );
      }}
    />
  );
}
