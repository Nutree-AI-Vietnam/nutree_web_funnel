'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PrimaryButton } from '@/components/primary-button';
import { vi } from '@/lib/copy/vi';
import { nextRoute } from '@/lib/quiz/steps';
import { useQuizStore } from '@/lib/quiz/store';
import { bmi, bmiCategory, weeksToTarget } from '@/lib/tdee/insights';

const BMI_MIN = 15;
const BMI_MAX = 35;

export function TdeeTargetsStep() {
  const router = useRouter();
  const data = useQuizStore((s) => s.data);
  const tdee = useQuizStore((s) => s.tdee);

  const missing = !tdee || !data.weight_kg || !data.height_cm;
  useEffect(() => {
    if (missing) router.replace('/quiz/calculating');
  }, [missing, router]);
  if (missing || !tdee || !data.weight_kg || !data.height_cm) return null;

  const bmiValue = bmi(data.weight_kg, data.height_cm);
  const category = bmiCategory(bmiValue);
  const bmiPct = Math.min(Math.max((bmiValue - BMI_MIN) / (BMI_MAX - BMI_MIN), 0), 1) * 100;
  const weeks = weeksToTarget({
    currentKg: data.weight_kg,
    targetKg: data.target_weight_kg,
    goal: data.fitness_goal,
  });

  const macroCard = (label: string, grams: number, colorClass: string) => (
    <div className="flex min-h-24 flex-col items-center justify-center gap-1 rounded-2xl bg-white p-4 shadow-sm transition hover:-translate-y-0.5">
      <span className={`text-2xl font-extrabold ${colorClass}`}>{Math.round(grams)}g</span>
      <span className="text-sm text-muted-brand">{label}</span>
    </div>
  );

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="relative overflow-hidden rounded-3xl bg-mist/70 p-5">
        <div aria-hidden="true" className="absolute right-3 top-0 text-[5rem] font-extrabold leading-none text-white/70">
          07
        </div>
        <p className="relative text-sm font-bold text-emerald-brand">{vi.tdee_targets.eyebrow}</p>
        <h1 className="relative mt-2 text-2xl font-extrabold leading-tight text-forest">
          {vi.tdee_targets.headline}
        </h1>
      </div>

      <div className="rounded-3xl bg-forest p-6 text-center text-white shadow-sm animate-soft-enter">
        <div className="text-5xl font-extrabold">{Math.round(tdee.calories)}</div>
        <div className="mt-1 text-sm opacity-80">{vi.tdee_targets.calories}</div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {macroCard(vi.tdee_targets.protein, tdee.protein_g, 'text-protein')}
        {macroCard(vi.tdee_targets.carbs, tdee.carbs_g, 'text-carbs')}
        {macroCard(vi.tdee_targets.fat, tdee.fat_g, 'text-fat')}
      </div>
      <p className="-mt-3 text-center text-sm text-muted-brand">{vi.tdee_targets.macroNote}</p>

      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <div className="mb-2 flex items-baseline justify-between gap-3">
          <span className="font-semibold text-forest">{vi.tdee_targets.bmiTitle}</span>
          <span className="text-right text-sm text-muted-brand">
            {bmiValue.toFixed(1)} - {vi.tdee_targets.bmiCategories[category]}
          </span>
        </div>
        <div className="relative h-3 rounded-full bg-gradient-to-r from-sky-400 via-emerald-400 to-red-400">
          <div
            className="absolute top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-white bg-forest shadow"
            style={{ left: `${bmiPct}%` }}
          />
        </div>
      </div>

      {weeks !== null && data.target_weight_kg != null && (
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="mb-1 font-semibold text-forest">{vi.tdee_targets.projectionTitle}</div>
          <div className="text-sm text-muted-brand">
            {data.weight_kg}kg -&gt; {data.target_weight_kg}kg ·{' '}
            {vi.tdee_targets.projectionWeeks(weeks)}
          </div>
        </div>
      )}

      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <div className="mb-3 font-semibold text-forest">{vi.tdee_targets.sourceTitle}</div>
        <div className="grid gap-2">
          {vi.tdee_targets.sourceItems.map((item) => (
            <div key={item} className="flex items-center justify-between gap-3 rounded-xl bg-bg-brand px-3 py-2 text-sm font-medium text-slate-brand">
              <span>{item}</span>
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-teal-brand text-xs text-white">
                ✓
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-auto pt-4">
        <PrimaryButton onClick={() => router.push(nextRoute('tdee_targets'))}>
          {vi.common.continue}
        </PrimaryButton>
      </div>
    </div>
  );
}
