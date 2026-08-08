'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PrimaryButton } from '@/components/primary-button';
import { useCopy } from '@/lib/copy/use-copy';
import { goToNextQuizStep, goToQuizStep } from '@/lib/quiz/navigation';
import { useQuizStore } from '@/lib/quiz/store';
import { bmi, bmiCategory } from '@/lib/tdee/insights';

const BMI_MIN = 15;
const BMI_MAX = 35;

export function TdeeTargetsStep() {
  const vi = useCopy();
  const router = useRouter();
  const data = useQuizStore((s) => s.data);
  const tdee = useQuizStore((s) => s.tdee);
  const [displayCalories, setDisplayCalories] = useState(0);

  const missing = !tdee || !data.weight_kg || !data.height_cm;
  useEffect(() => {
    if (missing) goToQuizStep(router, 'calculating');
  }, [missing, router]);

  useEffect(() => {
    if (!tdee) return;
    const target = Math.round(tdee.calories);
    let frame = 0;
    const totalFrames = 36;
    const timer = setInterval(() => {
      frame += 1;
      const progress = 1 - Math.pow(1 - frame / totalFrames, 3);
      setDisplayCalories(Math.round(target * progress));
      if (frame >= totalFrames) clearInterval(timer);
    }, 24);

    return () => clearInterval(timer);
  }, [tdee]);

  if (missing || !tdee || !data.weight_kg || !data.height_cm) return null;

  const bmiValue = bmi(data.weight_kg, data.height_cm);
  const category = bmiCategory(bmiValue);
  const bmiPct = Math.min(Math.max((bmiValue - BMI_MIN) / (BMI_MAX - BMI_MIN), 0), 1) * 100;
  const macroTotal = tdee.protein_g + tdee.carbs_g + tdee.fat_g;
  const macroItems = [
    { label: vi.tdee_targets.protein, value: Math.round(tdee.protein_g), color: 'bg-protein' },
    { label: vi.tdee_targets.carbs, value: Math.round(tdee.carbs_g), color: 'bg-carbs' },
    { label: vi.tdee_targets.fat, value: Math.round(tdee.fat_g), color: 'bg-fat' },
  ];

  return (
    <div className="flex flex-1 flex-col gap-3">
      <section className="surface-grain relative overflow-hidden rounded-[1.7rem] bg-white/88 p-3.5 shadow-[0_24px_72px_rgb(26_71_57_/_0.15),inset_0_1px_0_rgb(255_255_255_/_0.82)] backdrop-blur animate-soft-enter">
        <div className="absolute -right-10 -top-12 h-32 w-32 rounded-full bg-teal-brand/20 blur-2xl" />
        <p className="relative text-xs font-extrabold uppercase tracking-[0.16em] text-teal-brand">{vi.tdee_targets.eyebrow}</p>
        <h1 className="relative mt-1 text-[1.45rem] font-extrabold leading-tight text-forest">{vi.tdee_targets.headline}</h1>
        <p className="relative mt-1.5 text-xs font-semibold leading-relaxed text-slate-brand">{vi.tdee_targets.aha}</p>

        <div className="relative mt-3 grid grid-cols-[1fr_auto] items-center gap-3">
          <div>
            <div className="text-[3rem] font-extrabold leading-none text-forest">
              {displayCalories || Math.round(tdee.calories)}
            </div>
            <div className="mt-1 text-sm font-extrabold text-muted-brand">{vi.tdee_targets.calories}</div>
          </div>
          <div
            className="grid h-20 w-20 place-items-center rounded-full p-2 shadow-inner"
            style={{ background: 'conic-gradient(#29b6a1 0 76%, #e8f2ee 76% 100%)' }}
          >
            <div className="grid h-full w-full place-items-center rounded-full bg-white text-center">
              <span className="text-xs font-extrabold text-forest">TDEE</span>
            </div>
          </div>
        </div>

        <div className="relative mt-3 overflow-hidden rounded-2xl bg-bg-brand/88 p-2 shadow-[inset_0_1px_18px_rgb(26_71_57_/_0.04)]">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-extrabold text-forest">{vi.tdee_targets.macroNote}</span>
            <span className="text-[0.7rem] font-bold text-muted-brand">{vi.tdee_targets.perDayUnit}</span>
          </div>
          <div className="flex h-3 overflow-hidden rounded-full bg-white">
            {macroItems.map((item) => (
              <span
                key={item.label}
                className={item.color}
                style={{ width: `${Math.max((item.value / macroTotal) * 100, 12)}%` }}
              />
            ))}
          </div>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {macroItems.map((item) => (
              <div key={item.label} className="rounded-xl bg-white px-2 py-1.5">
                <div className="text-base font-extrabold text-forest">{item.value}g</div>
                <div className="text-[0.68rem] font-bold text-muted-brand">{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-2xl bg-white/82 p-2.5 shadow-[0_12px_34px_rgb(26_71_57_/_0.08),inset_0_1px_0_rgb(255_255_255_/_0.78)] backdrop-blur">
        <div className="mb-2 flex items-baseline justify-between gap-3">
          <span className="font-extrabold text-forest">{vi.tdee_targets.bmiTitle}</span>
          <span className="text-right text-sm font-semibold text-muted-brand">
            {bmiValue.toFixed(1)} - {vi.tdee_targets.bmiCategories[category]}
          </span>
        </div>
        <div className="relative h-3 rounded-full bg-gradient-to-r from-sky-400 via-emerald-400 to-red-400">
          <div
            className="absolute top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-white bg-forest shadow"
            style={{ left: `${bmiPct}%` }}
          />
        </div>
      </section>

      <section className="rounded-2xl bg-white/82 p-2.5 shadow-[0_12px_34px_rgb(26_71_57_/_0.08),inset_0_1px_0_rgb(255_255_255_/_0.78)] backdrop-blur">
        <div className="mb-2 text-sm font-extrabold text-forest">{vi.tdee_targets.sourceTitle}</div>
        <div className="grid gap-1">
          {vi.tdee_targets.sourceItems.map((item) => (
            <div key={item} className="flex items-center gap-2 rounded-xl bg-bg-brand px-3 py-0.5 text-[0.7rem] font-semibold text-slate-brand">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal-brand text-xs text-white">
                ✓
              </span>
              <span>{item}</span>
            </div>
          ))}
        </div>
      </section>

      <div className="mt-auto pt-1">
        <PrimaryButton onClick={() => goToNextQuizStep(router, 'result')}>
          {vi.common.continue}
        </PrimaryButton>
      </div>
    </div>
  );
}
