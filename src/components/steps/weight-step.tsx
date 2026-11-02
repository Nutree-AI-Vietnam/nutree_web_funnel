'use client';

import { useCopy, useLocale } from '@/lib/copy/use-copy';
import { useQuizStore } from '@/lib/quiz/store';
import { bmi, bmiCategory, formatBmi } from '@/lib/tdee/insights';
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
        const category = bmiCategory(value);
        const tone = category === 'normal'
          ? 'bg-emerald-50 text-emerald-800'
          : category === 'overweight'
            ? 'bg-amber-50 text-amber-900'
            : 'bg-red-50 text-red-800';
        const dot = category === 'normal' ? 'bg-emerald-500' : category === 'overweight' ? 'bg-amber-500' : 'bg-red-500';
        return (
          <p aria-live="polite" className={`mx-auto flex shrink-0 items-center gap-2 rounded-full px-4 py-1.5 text-center text-sm font-extrabold shadow-sm ${tone}`}>
            <span aria-hidden="true" className={`h-2 w-2 shrink-0 rounded-full ${dot}`} />
            {copy.funnel.weightBmi(formatBmi(value, locale), copy.funnel.bmiCategory[category])}
          </p>
        );
      }}
    />
  );
}
