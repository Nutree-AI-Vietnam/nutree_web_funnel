'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PrimaryButton } from '@/components/primary-button';
import { useCopy, useLocale } from '@/lib/copy/use-copy';
import { goToNextQuizStep, goToQuizStep } from '@/lib/quiz/navigation';
import { useQuizStore } from '@/lib/quiz/store';
import { bmi, bmiCategory, formatBmi, wholePercents } from '@/lib/tdee/insights';
import { CountUp } from '@/components/ui/count-up';
import { Icon } from '@/components/ui/icons';
import type { TdeeResult } from '@/lib/quiz/types';
import { workoutCredit } from '@/lib/tdee/calculator';
import { motion, useReducedMotion } from 'motion/react';
import { cn } from '@/lib/utils';

const BMI_MIN = 15;
const BMI_MAX = 35;

// Traffic-light zones: blue under, green healthy, yellow over, red well over.
const BMI_ZONES = [
  { from: BMI_MIN, to: 18.5, className: 'bg-[#6aa8e0]', color: '#3f7fbf' },
  { from: 18.5, to: 25, className: 'bg-[#36b37e]', color: '#1f8f5f' },
  { from: 25, to: 30, className: 'bg-[#f2c14e]', color: '#b8860b' },
  { from: 30, to: BMI_MAX, className: 'bg-[#e8604c]', color: '#c2412f' },
] as const;
const bmiColor = (value: number) => (BMI_ZONES.find((zone) => value < zone.to) ?? BMI_ZONES[BMI_ZONES.length - 1]).color;
const toPct = (value: number) => (Math.min(Math.max(value, BMI_MIN), BMI_MAX) - BMI_MIN) / (BMI_MAX - BMI_MIN) * 100;

/** A BMI gauge: soft zones coloured blue, green, yellow and red, tick values, and a marker that slides to the visitor's value. */
function BmiGauge({ value, healthyLabel, locale }: { value: number; healthyLabel: string; locale: string }) {
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
          <span className="absolute bottom-[calc(100%+0.45rem)] left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg px-2 py-0.5 text-[0.78rem] font-extrabold tabular-nums text-white shadow-[0_6px_16px_rgb(23_69_58_/_0.25)]" style={{ background: bmiColor(value) }}>
            {formatBmi(value, locale)}
          </span>
          <span className="block h-5 w-5 rounded-full border-[3px] border-white shadow-[0_4px_12px_rgb(23_69_58_/_0.3)]" style={{ background: bmiColor(value) }} />
        </motion.div>
      </div>
      <div className="relative mt-1.5 h-4 text-[0.64rem] font-bold tabular-nums text-muted-brand" aria-hidden="true">
        {[18.5, 25, 30].map((tick) => (
          <span key={tick} className="absolute -translate-x-1/2" style={{ left: `${toPct(tick)}%` }}>{Number.isInteger(tick) ? tick : formatBmi(tick, locale)}</span>
        ))}
      </div>
      <p className="mt-1 flex items-center gap-1.5 text-[0.72rem] font-bold text-[#1f8f5f]">
        <span aria-hidden="true" className="h-2 w-2 rounded-full bg-[#36b37e]" />
        {healthyLabel}
      </p>
    </div>
  );
}

const MACROS = [
  { key: 'protein', kcalPerGram: 4, bar: 'bg-protein', tint: 'bg-[#fdf1e4]', text: 'text-[#b5631a]' },
  { key: 'carbs', kcalPerGram: 4, bar: 'bg-carbs', tint: 'bg-[#e3f4f1]', text: 'text-[#0b7a70]' },
  { key: 'fat', kcalPerGram: 9, bar: 'bg-fat', tint: 'bg-[#faf3dc]', text: 'text-[#957a0e]' },
] as const;

/** The day's calories and the macro split, in the same quiet Nutree card as the rest of the quiz. */
function ResultHero({ tdee, locale }: { tdee: TdeeResult; locale: string }) {
  const copy = useCopy();
  const labels = copy.tdee_targets;
  const format = (value: number) => new Intl.NumberFormat(locale === 'vi' ? 'vi-VN' : 'en-US').format(Math.round(value));
  const grams = { protein: tdee.protein_g, carbs: tdee.carbs_g, fat: tdee.fat_g };
  // Shares of the day's calories, as whole percents that add up to 100.
  const percents = wholePercents(MACROS.map((m) => grams[m.key] * m.kcalPerGram));
  return (
    <div className="mt-4">
      <p className="sr-only">{labels.summary(format(tdee.calories), Math.round(tdee.protein_g), Math.round(tdee.carbs_g), Math.round(tdee.fat_g))}</p>
      <div className="rounded-[1.2rem] bg-[#f3f7f5] px-4 py-4">
        <p className="text-[0.8rem] font-semibold text-muted-brand">{labels.calories}</p>
        <p className="mt-1 flex items-end gap-1.5 text-forest">
          <span className="text-[2.6rem] font-extrabold leading-none tracking-[-0.04em] tabular-nums"><CountUp value={Math.round(tdee.calories)} format={format} delay={0.2} duration={1.1} /></span>
          <span className="mb-1 text-[0.85rem] font-semibold text-slate-brand">{copy.funnel.day.kcal}</span>
        </p>
      </div>
      <div aria-hidden="true" className="mt-3 divide-y divide-forest/10">
        {MACROS.map((macro, index) => {
          const percent = percents[index];
          return (
            <div key={macro.key} className="flex items-center gap-3 py-2.5">
              <span className={cn('h-2.5 w-2.5 shrink-0 rounded-full', macro.bar)} />
              <span className="min-w-0 flex-1 text-[0.92rem] font-medium text-forest">{labels[macro.key]}</span>
              <span className="text-[1.05rem] font-extrabold tabular-nums text-forest">
                <CountUp value={Math.round(grams[macro.key])} format={format} delay={0.35 + index * 0.08} duration={0.8} />
                <span className="ml-0.5 text-[0.75rem] font-semibold text-muted-brand">g</span>
              </span>
              <span className="w-10 text-right text-[0.75rem] font-semibold tabular-nums text-muted-brand">{percent}%</span>
            </div>
          );
        })}
      </div>
    </div>
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
  const trainingMinutes = data.training_days_per_week ? data.training_minutes_per_session ?? 0 : 0;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="quiz-step-body min-h-0 flex-1 overflow-y-auto overscroll-contain">
      <div className="quiz-step-stack flex min-h-full flex-col gap-4">
      <section className="rounded-[1.7rem] bg-white/92 p-4 shadow-[0_6px_16px_rgb(26_71_57_/_0.07),inset_0_1px_0_rgb(255_255_255_/_0.82)] backdrop-blur animate-soft-enter">
        {vi.tdee_targets.eyebrow && <p className="text-xs font-extrabold tracking-[0.02em] text-teal-brand">{vi.tdee_targets.eyebrow}</p>}
        <h1 className="text-[1.45rem] font-extrabold leading-tight text-forest">{vi.tdee_targets.headline}</h1>
        <p className="mt-1 text-xs font-semibold leading-relaxed text-slate-brand">{vi.tdee_targets.aha}</p>
        <ResultHero tdee={tdee} locale={locale} />
        {/* Training never raises the daily target: as in the app, a logged workout adds what it burns to that day. */}
        <p className="mt-4 flex items-start gap-2 rounded-2xl bg-mist px-3 py-3 text-[0.82rem] font-semibold leading-snug text-forest">
          <Icon name="dumbbell" className="mt-px h-4 w-4 shrink-0 text-teal-brand" />
          <span>
            {trainingMinutes > 0
              ? vi.tdee_targets.trainingCredit(new Intl.NumberFormat(locale === 'vi' ? 'vi-VN' : 'en-US').format(workoutCredit(data.weight_kg, trainingMinutes)), trainingMinutes)
              : vi.tdee_targets.trainingCreditNone}
          </span>
        </p>
      </section>

      <section className="rounded-[1.4rem] bg-white/88 p-4 shadow-[0_12px_34px_rgb(26_71_57_/_0.08),inset_0_1px_0_rgb(255_255_255_/_0.78)] backdrop-blur">
        <div className="flex items-baseline justify-between gap-3">
          <span className="font-extrabold text-forest">{vi.tdee_targets.bmiTitle}</span>
          <span className="text-right text-sm font-extrabold" style={{ color: bmiColor(bmiValue) }}>{vi.tdee_targets.bmiCategories[category]}</span>
        </div>
        <BmiGauge value={bmiValue} healthyLabel={vi.tdee_targets.bmiHealthy} locale={locale} />
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
