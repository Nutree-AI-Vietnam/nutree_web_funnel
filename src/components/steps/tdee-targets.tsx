'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PrimaryButton } from '@/components/primary-button';
import { useCopy, useLocale } from '@/lib/copy/use-copy';
import { goToNextQuizStep, goToQuizStep } from '@/lib/quiz/navigation';
import { useQuizStore } from '@/lib/quiz/store';
import { bmi, bmiCategory } from '@/lib/tdee/insights';
import { CalorieRing, macroShares } from '@/components/plan/plan-overview';

const BMI_MIN = 15;
const BMI_MAX = 35;

export function TdeeTargetsStep() {
  const vi = useCopy();
  const locale = useLocale();
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
  const shares = macroShares(tdee, vi.tdee_targets);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="quiz-step-body -mx-5 min-h-0 flex-1 overflow-x-clip overflow-y-auto overscroll-contain px-5">
      <div className="quiz-step-stack flex min-h-full flex-col gap-3">
      <section className="surface-grain relative overflow-hidden rounded-[1.7rem] bg-white/88 p-3.5 shadow-[0_24px_72px_rgb(26_71_57_/_0.15),inset_0_1px_0_rgb(255_255_255_/_0.82)] backdrop-blur animate-soft-enter">
        <div className="absolute -right-10 -top-12 h-32 w-32 rounded-full bg-teal-brand/20 blur-2xl" />
        <p className="relative text-xs font-extrabold tracking-[0.02em] text-teal-brand">{vi.tdee_targets.eyebrow}</p>
        <h1 className="relative mt-1 text-[1.45rem] font-extrabold leading-tight text-forest">{vi.tdee_targets.headline}</h1>
        <p className="relative mt-1.5 text-xs font-semibold leading-relaxed text-slate-brand">{vi.tdee_targets.aha}</p>

        {/* The same ring as the plan and paywall, drawn in as the calories count up. */}
        <div className="relative mt-4 flex items-center gap-4">
          <CalorieRing total={(displayCalories || Math.round(tdee.calories)).toLocaleString(locale === 'vi' ? 'vi-VN' : 'en-US')} unit={vi.funnel.day.kcal} macros={shares} draw />
          <ul className="grid min-w-0 flex-1 gap-2.5">
            {shares.map((macro) => (
              <li key={macro.label} className="flex items-center gap-2 text-[0.9rem]">
                <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: macro.color }} />
                <span className="min-w-0 flex-1 whitespace-nowrap font-bold text-slate-brand">{macro.label}</span>
                <span className="whitespace-nowrap font-extrabold tabular-nums text-forest">{macro.grams} g</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="rounded-2xl bg-white/82 p-2.5 shadow-[0_12px_34px_rgb(26_71_57_/_0.08),inset_0_1px_0_rgb(255_255_255_/_0.78)] backdrop-blur">
        <div className="mb-2 flex items-baseline justify-between gap-3">
          <span className="font-extrabold text-forest">{vi.tdee_targets.bmiTitle}</span>
          <span className="text-right text-sm font-semibold text-muted-brand">
            {bmiValue.toFixed(1)} - {vi.tdee_targets.bmiCategories[category]}
          </span>
        </div>
        {/* Brand track with the healthy range marked, instead of a red-to-blue judgement scale. */}
        <div className="relative h-3 rounded-full bg-mist">
          <span aria-hidden="true" className="absolute inset-y-0 rounded-full bg-teal-brand/45" style={{ left: `${((18.5 - BMI_MIN) / (BMI_MAX - BMI_MIN)) * 100}%`, width: `${((24.9 - 18.5) / (BMI_MAX - BMI_MIN)) * 100}%` }} />
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

      </div>
      </div>
      <div className="quiz-step-cta relative z-20 shrink-0 pt-3">
        <PrimaryButton onClick={() => goToNextQuizStep(router, 'result')}>
          {vi.common.continue}
        </PrimaryButton>
      </div>
    </div>
  );
}
