'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PrimaryButton } from '@/components/primary-button';
import { useCopy, useLocale } from '@/lib/copy/use-copy';
import { goToNextQuizStep, goToQuizStep } from '@/lib/quiz/navigation';
import { useQuizStore } from '@/lib/quiz/store';
import { bmi, bmiCategory } from '@/lib/tdee/insights';
import { CalorieRing, MacroLegend, macroShares } from '@/components/plan/plan-overview';
import { motion, useReducedMotion } from 'motion/react';
import { useUnits } from '@/lib/quiz/use-units';
import type { OnboardingPayload, TdeeResult } from '@/lib/quiz/types';
import { cn } from '@/lib/utils';

const BMI_MIN = 15;
const BMI_MAX = 35;

const KG_PER_LB = 0.45359237;
const BMI_ZONES = [
  { from: BMI_MIN, to: 18.5, className: 'bg-[#d9e6ee]' },
  { from: 18.5, to: 25, className: 'bg-teal-brand/60' },
  { from: 25, to: 30, className: 'bg-[#efdcb0]' },
  { from: 30, to: BMI_MAX, className: 'bg-[#efc8b8]' },
] as const;
const toPct = (value: number) => (Math.min(Math.max(value, BMI_MIN), BMI_MAX) - BMI_MIN) / (BMI_MAX - BMI_MIN) * 100;

/** A BMI gauge: soft zones with the healthy one in brand teal, tick values, and a marker that slides to the visitor's value. */
function BmiGauge({ value, healthyLabel }: { value: number; healthyLabel: string }) {
  const reduce = useReducedMotion();
  const position = `${toPct(value)}%`;
  return (
    <div className="pt-8">
      <div className="relative">
        <div className="flex h-3 gap-[3px] overflow-hidden rounded-full">
          {BMI_ZONES.map((zone) => (
            <span key={zone.from} className={cn('h-full', zone.className)} style={{ width: `${toPct(zone.to) - toPct(zone.from)}%` }} />
          ))}
        </div>
        <motion.div
          className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
          initial={reduce ? false : { left: '0%' }}
          whileInView={{ left: position }}
          viewport={{ once: true }}
          transition={{ type: 'spring', stiffness: 70, damping: 14, delay: 0.3 }}
          style={{ left: position }}
        >
          <span className="absolute bottom-[calc(100%+0.45rem)] left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-forest px-2 py-0.5 text-[0.78rem] font-extrabold tabular-nums text-white shadow-[0_6px_16px_rgb(23_69_58_/_0.25)]">
            {value.toFixed(1)}
          </span>
          <span className="block h-5 w-5 rounded-full border-[3px] border-white bg-forest shadow-[0_4px_12px_rgb(23_69_58_/_0.3)]" />
        </motion.div>
      </div>
      <div className="relative mt-1.5 h-4 text-[0.64rem] font-bold tabular-nums text-muted-brand" aria-hidden="true">
        {[18.5, 25, 30].map((tick) => (
          <span key={tick} className="absolute -translate-x-1/2" style={{ left: `${toPct(tick)}%` }}>{tick}</span>
        ))}
      </div>
      <p className="mt-1 flex items-center gap-1.5 text-[0.72rem] font-bold text-teal-brand">
        <span aria-hidden="true" className="h-2 w-2 rounded-full bg-teal-brand/70" />
        {healthyLabel}
      </p>
    </div>
  );
}

/** The arithmetic behind the targets, so the visitor can see the numbers are theirs, not a template. */
function MathCard({ data, tdee, locale }: { data: OnboardingPayload; tdee: TdeeResult; locale: string }) {
  const vi = useCopy();
  const { system } = useUnits();
  const reduce = useReducedMotion();
  const math = vi.tdee_targets.math;
  const number = new Intl.NumberFormat(locale === 'vi' ? 'vi-VN' : 'en-US');
  const burn = Math.round(tdee.tdee);
  const target = Math.round(tdee.calories);
  const adjustment = target - burn;
  const weightKg = data.weight_kg ?? 0;
  const imperial = system === 'imperial';
  const weight = imperial ? weightKg / KG_PER_LB : weightKg;
  const rate = weight > 0 ? tdee.protein_g / weight : 0;
  const rows = [
    adjustment === 0
      ? [{ value: number.format(burn), label: math.burn }, '=', { value: `${number.format(target)} kcal`, label: math.target, strong: true }]
      : [
          { value: number.format(burn), label: math.burn },
          adjustment < 0 ? '−' : '+',
          { value: number.format(Math.abs(adjustment)), label: adjustment < 0 ? math.cut : math.bulk },
          '=',
          { value: `${number.format(target)} kcal`, label: math.target, strong: true },
        ],
    [
      { value: `${new Intl.NumberFormat(locale === 'vi' ? 'vi-VN' : 'en-US', { maximumFractionDigits: imperial ? 2 : 1 }).format(rate)} g`, label: imperial ? math.perLb : math.perKg },
      '×',
      { value: `${new Intl.NumberFormat(locale === 'vi' ? 'vi-VN' : 'en-US', { maximumFractionDigits: 1 }).format(weight)} ${imperial ? 'lb' : 'kg'}`, label: math.weight },
      '≈',
      { value: `${Math.round(tdee.protein_g)} g`, label: math.protein, strong: true },
    ],
  ] as const;
  let order = 0;
  return (
    <section className="rounded-[1.4rem] bg-white/88 p-3.5 shadow-[0_12px_34px_rgb(26_71_57_/_0.08),inset_0_1px_0_rgb(255_255_255_/_0.78)] backdrop-blur">
      <h2 className="text-sm font-extrabold text-forest">{math.title}</h2>
      <div className="mt-2.5 grid gap-2">
        {rows.map((row, rowIndex) => (
          <div key={rowIndex} className={cn('grid items-center gap-1', row.length === 5 ? 'grid-cols-[1fr_auto_1fr_auto_1fr]' : 'grid-cols-[1fr_auto_1fr]')}>
            {row.map((part, index) => {
              const delay = 0.2 + (order += 1) * 0.08;
              return typeof part === 'string' ? (
                <span key={index} className="px-0.5 text-center text-base font-extrabold text-muted-brand" aria-hidden="true">{part}</span>
              ) : (
                <motion.span
                  key={index}
                  className={cn('rounded-xl px-1.5 py-1.5 text-center', 'strong' in part && part.strong ? 'bg-forest text-white' : 'bg-mist text-forest')}
                  initial={reduce ? false : { opacity: 0, y: 6 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay, duration: 0.35, ease: 'easeOut' }}
                >
                  <span className="block text-[0.86rem] font-extrabold leading-tight tabular-nums">{part.value}</span>
                  <span className={cn('block text-[0.6rem] font-bold leading-tight', 'strong' in part && part.strong ? 'text-white/75' : 'text-muted-brand')}>{part.label}</span>
                </motion.span>
              );
            })}
          </div>
        ))}
      </div>
      <p className="mt-2.5 text-[0.7rem] font-semibold text-muted-brand">{math.note}</p>
    </section>
  );
}

export function TdeeTargetsStep() {
  const vi = useCopy();
  const locale = useLocale();
  const router = useRouter();
  const data = useQuizStore((s) => s.data);
  const tdee = useQuizStore((s) => s.tdee);

  const missing = !tdee || !data.weight_kg || !data.height_cm;
  useEffect(() => {
    if (missing) goToQuizStep(router, 'calculating');
  }, [missing, router]);


  if (missing || !tdee || !data.weight_kg || !data.height_cm) return null;

  const bmiValue = bmi(data.weight_kg, data.height_cm);
  const category = bmiCategory(bmiValue);
  const shares = macroShares(tdee, vi.tdee_targets);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="quiz-step-body -mx-5 min-h-0 flex-1 overflow-x-clip overflow-y-auto overscroll-contain px-5">
      <div className="quiz-step-stack flex min-h-full flex-col gap-3">
      <section className="surface-grain relative overflow-hidden rounded-[1.7rem] bg-white/90 p-4 shadow-[0_24px_72px_rgb(26_71_57_/_0.15),inset_0_1px_0_rgb(255_255_255_/_0.82)] backdrop-blur animate-soft-enter">
        <div className="absolute -right-10 -top-12 h-32 w-32 rounded-full bg-teal-brand/20 blur-2xl" />
        {vi.tdee_targets.eyebrow && <p className="relative text-xs font-extrabold tracking-[0.02em] text-teal-brand">{vi.tdee_targets.eyebrow}</p>}
        <h1 className="relative text-[1.45rem] font-extrabold leading-tight text-forest">{vi.tdee_targets.headline}</h1>
        <p className="relative mt-1 text-xs font-semibold leading-relaxed text-slate-brand">{vi.tdee_targets.aha}</p>
        {/* The reveal: the ring draws segment by segment while the calories count up and each macro bar fills. */}
        <div className="relative mt-4 flex items-center gap-4">
          <CalorieRing total={Math.round(tdee.calories)} locale={locale} unit={vi.funnel.day.kcal} macros={shares} size="lg" />
          <MacroLegend macros={shares} />
        </div>
      </section>

      <section className="rounded-[1.4rem] bg-white/88 p-3.5 shadow-[0_12px_34px_rgb(26_71_57_/_0.08),inset_0_1px_0_rgb(255_255_255_/_0.78)] backdrop-blur">
        <div className="flex items-baseline justify-between gap-3">
          <span className="font-extrabold text-forest">{vi.tdee_targets.bmiTitle}</span>
          <span className="text-right text-sm font-semibold text-muted-brand">{vi.tdee_targets.bmiCategories[category]}</span>
        </div>
        <BmiGauge value={bmiValue} healthyLabel={vi.tdee_targets.bmiHealthy} />
      </section>

      <MathCard data={data} tdee={tdee} locale={locale} />

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
