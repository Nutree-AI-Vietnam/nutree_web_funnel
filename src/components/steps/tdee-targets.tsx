'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PrimaryButton } from '@/components/primary-button';
import { useCopy, useLocale } from '@/lib/copy/use-copy';
import { goToNextQuizStep, goToQuizStep } from '@/lib/quiz/navigation';
import { useQuizStore } from '@/lib/quiz/store';
import { bmi, bmiCategory } from '@/lib/tdee/insights';
import Image from 'next/image';
import { CountUp } from '@/components/ui/count-up';
import { Icon } from '@/components/ui/icons';
import type { TdeeResult } from '@/lib/quiz/types';
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
  // Decimal comma in Vietnamese, matching the healthy-range line under the gauge.
  const decimal = new Intl.NumberFormat(locale === 'vi' ? 'vi-VN' : 'en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
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
            {decimal.format(value)}
          </span>
          <span className="block h-5 w-5 rounded-full border-[3px] border-white shadow-[0_4px_12px_rgb(23_69_58_/_0.3)]" style={{ background: bmiColor(value) }} />
        </motion.div>
      </div>
      <div className="relative mt-1.5 h-4 text-[0.64rem] font-bold tabular-nums text-muted-brand" aria-hidden="true">
        {[18.5, 25, 30].map((tick) => (
          <span key={tick} className="absolute -translate-x-1/2" style={{ left: `${toPct(tick)}%` }}>{Number.isInteger(tick) ? tick : decimal.format(tick)}</span>
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

/** The reveal: a bowl photo, the day's calories counting up, and three macro tiles whose bars fill to their share of the day. */
function ResultHero({ tdee, locale }: { tdee: TdeeResult; locale: string }) {
  const copy = useCopy();
  const reduce = useReducedMotion();
  const labels = copy.tdee_targets;
  const format = (value: number) => new Intl.NumberFormat(locale === 'vi' ? 'vi-VN' : 'en-US').format(Math.round(value));
  const grams = { protein: tdee.protein_g, carbs: tdee.carbs_g, fat: tdee.fat_g };
  const total = MACROS.reduce((sum, m) => sum + grams[m.key] * m.kcalPerGram, 0) || 1;
  return (
    <div className="mt-4">
      <p className="sr-only">{labels.summary(format(tdee.calories), Math.round(tdee.protein_g), Math.round(tdee.carbs_g), Math.round(tdee.fat_g))}</p>
      <div aria-hidden="true" className="relative h-[8.5rem] overflow-hidden rounded-[1.3rem]">
        <motion.div className="absolute inset-0" initial={reduce ? false : { scale: 1.1 }} animate={{ scale: 1 }} transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}>
          <Image src="/images/result-bowl.webp" alt="" fill sizes="420px" className="object-cover" priority />
        </motion.div>
        <div className="absolute inset-0 bg-gradient-to-t from-forest/90 via-forest/35 to-transparent" />
        <div className="absolute inset-x-3.5 bottom-3 flex items-end justify-between gap-3 text-white">
          <span className="flex items-center gap-1.5 text-[0.82rem] font-bold">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20 backdrop-blur"><Icon name="flame" className="h-4 w-4" /></span>
            {labels.calories}
          </span>
          <span className="flex flex-col items-end leading-none">
            <span className="text-[2.6rem] font-extrabold tracking-[-0.04em] tabular-nums [text-shadow:0_2px_14px_rgb(10_40_32_/_0.55)]"><CountUp value={Math.round(tdee.calories)} format={format} delay={0.25} duration={1.3} /></span>
            <span className="mt-1 whitespace-nowrap text-[0.74rem] font-bold text-white/80">{copy.funnel.day.kcal}</span>
          </span>
        </div>
      </div>
      <div aria-hidden="true" className="mt-2.5 grid grid-cols-3 gap-2">
        {MACROS.map((macro, index) => {
          const share = (grams[macro.key] * macro.kcalPerGram) / total;
          return (
            <motion.div
              key={macro.key}
              className={cn('rounded-2xl p-2.5', macro.tint)}
              initial={reduce ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45 + index * 0.1, duration: 0.4 }}
            >
              <span className={cn('block text-[0.72rem] font-extrabold', macro.text)}>{labels[macro.key]}</span>
              <span className="mt-1 block text-[1.45rem] font-extrabold leading-none tracking-[-0.03em] text-forest tabular-nums">
                <CountUp value={Math.round(grams[macro.key])} format={format} delay={0.55 + index * 0.1} duration={0.9} />
                <span className="ml-0.5 text-[0.8rem] font-bold text-slate-brand">g</span>
              </span>
              <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-white">
                <motion.span
                  className={cn('block h-full rounded-full', macro.bar)}
                  initial={reduce ? false : { width: 0 }}
                  animate={{ width: `${Math.round(share * 100)}%` }}
                  transition={{ delay: 0.7 + index * 0.1, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                />
              </span>
              <span className="mt-1 block text-[0.66rem] font-bold tabular-nums text-muted-brand">{Math.round(share * 100)}%</span>
            </motion.div>
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

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="quiz-step-body -mx-5 min-h-0 flex-1 overflow-x-clip overflow-y-auto overscroll-contain px-5">
      <div className="quiz-step-stack flex min-h-full flex-col gap-3">
      <section className="rounded-[1.7rem] bg-white/92 p-4 shadow-[0_24px_72px_rgb(26_71_57_/_0.13),inset_0_1px_0_rgb(255_255_255_/_0.82)] backdrop-blur animate-soft-enter">
        {vi.tdee_targets.eyebrow && <p className="text-xs font-extrabold tracking-[0.02em] text-teal-brand">{vi.tdee_targets.eyebrow}</p>}
        <h1 className="text-[1.45rem] font-extrabold leading-tight text-forest">{vi.tdee_targets.headline}</h1>
        <p className="mt-1 text-xs font-semibold leading-relaxed text-slate-brand">{vi.tdee_targets.aha}</p>
        <ResultHero tdee={tdee} locale={locale} />
      </section>

      <section className="rounded-[1.4rem] bg-white/88 p-3.5 shadow-[0_12px_34px_rgb(26_71_57_/_0.08),inset_0_1px_0_rgb(255_255_255_/_0.78)] backdrop-blur">
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
