'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { motion, useReducedMotion } from 'motion/react';
import { PrimaryButton } from '@/components/primary-button';
import { useCopy, useLocale } from '@/lib/copy/use-copy';
import { recommendedStepGoal, STEP_GOAL } from '@/lib/quiz/step-goal';
import { goToNextQuizStep } from '@/lib/quiz/navigation';
import { useQuizStore } from '@/lib/quiz/store';
import { cn } from '@/lib/utils';
import { MetricWheelPicker } from './metric-wheel-picker';
import { QuizStepFrame } from './quiz-step-frame';

/**
 * Welcome screen: an empty plan card with the visitor's name on it. The same card fills in
 * with their numbers on the result and plan screens.
 */
export function WelcomeStep() {
  const router = useRouter();
  const copy = useCopy();
  const reduce = useReducedMotion();
  const name = useQuizStore((s) => s.data.name)?.trim();
  // Only a weight to lose or gain gets a goal date; other goals are promised their daily targets.
  const weightGoal = useQuizStore((s) => s.data.fitness_goal === 'cut' || s.data.fitness_goal === 'bulk');
  const labels = copy.welcome.labels;
  const rows = [
    ...(weightGoal ? [{ label: labels.goalDate, width: 'w-[88px]' }] : []),
    { label: labels.calories, width: 'w-[64px]' },
    { label: labels.protein, width: 'w-[48px]' },
    { label: labels.changes, width: 'w-[104px]' },
  ];

  return (
    <QuizStepFrame className="justify-center gap-5">
      {/* A warm photo first, so the screen greets the visitor before it asks anything. */}
      <motion.div
        initial={reduce ? false : { opacity: 0, scale: 1.04 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="relative h-[9.5rem] shrink-0 overflow-hidden rounded-[1.7rem] shadow-[0_6px_16px_rgb(23_69_58_/_0.07)]"
      >
        <Image src="/images/welcome-meal.webp" alt="" fill priority sizes="(max-width: 512px) 100vw, 512px" className="object-cover" />
        <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-forest/35 via-transparent to-transparent" />
      </motion.div>
      <motion.h1
        initial={reduce ? false : { opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="text-center text-[1.85rem] font-extrabold leading-tight text-forest"
      >
        {copy.welcome.headline}
      </motion.h1>

      <motion.section
        initial={reduce ? false : { opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 24, delay: 0.1 }}
        className="rounded-[1.7rem] bg-white/92 p-4 shadow-[0_6px_16px_rgb(26_71_57_/_0.07),inset_0_1px_0_rgb(255_255_255_/_0.82)] backdrop-blur"
      >
        <p className="ph-mask text-[1.45rem] font-extrabold leading-tight text-forest">
          {name ? copy.funnel.plan.eyebrow(name) : copy.funnel.plan.eyebrowFallback}
        </p>
        <div className="mt-3 h-1.5 rounded-full bg-forest" />
        <p className="sr-only">{rows.map((row) => row.label).join(', ')}</p>
        <div aria-hidden="true">
          {rows.map((row, index) => (
            <div key={row.label}>
              {index > 0 && <div className="h-px bg-forest/15" />}
              <div className="flex items-center justify-between gap-3 py-3.5">
                <span className="text-[0.95rem] font-extrabold text-forest">{row.label}</span>
                {/* Empty until the quiz fills it; the sheen passes once so it never reads as loading. */}
                <span className={cn('relative h-3.5 shrink-0 overflow-hidden rounded-full bg-forest/[0.08]', row.width)}>
                  {!reduce && (
                    <motion.span
                      className="absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-transparent via-teal-brand/30 to-transparent"
                      initial={{ x: '-100%' }}
                      animate={{ x: '220%' }}
                      transition={{ duration: 0.9, ease: 'easeInOut', delay: 0.5 + index * 0.15 }}
                    />
                  )}
                </span>
              </div>
            </div>
          ))}
        </div>
      </motion.section>

      <motion.p
        initial={reduce ? false : { opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.4 }}
        className="text-center text-[0.8125rem] font-semibold text-muted-brand"
      >
        {copy.welcome.footnote}
      </motion.p>

      <motion.div
        initial={reduce ? false : { opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45, duration: 0.4 }}
        className="mt-auto pt-4"
      >
        <PrimaryButton onClick={() => goToNextQuizStep(router, 'welcome')}>
          {copy.welcome.cta}
        </PrimaryButton>
      </motion.div>
    </QuizStepFrame>
  );
}

/** A breath before the plan builds: a beating heart and one line of support. */
export function NotAloneStep() {
  const router = useRouter();
  const copy = useCopy();
  const reduce = useReducedMotion();

  return (
    <QuizStepFrame className="gap-7 text-center">
      <div className="flex flex-1 flex-col items-center justify-center gap-8">
        <motion.svg
          viewBox="0 0 120 120"
          className="h-28 w-28 drop-shadow-[0_14px_24px_rgb(240_79_98_/_0.35)]"
          aria-hidden="true"
          initial={reduce ? false : { scale: 0.6, opacity: 0 }}
          animate={reduce ? { scale: 1, opacity: 1 } : { scale: [1, 1.08, 1], opacity: 1 }}
          transition={reduce ? { duration: 0 } : { scale: { duration: 1.6, repeat: Infinity, ease: 'easeInOut' }, opacity: { duration: 0.4 } }}
        >
          <path d="M60 98 18 55C-2 34 13 8 35 14c12 3 19 13 25 21 6-8 13-18 25-21 22-6 37 20 17 41L60 98Z" fill="#f04f62" />
          <path d="M30 31c4-6 10-9 17-9" fill="none" stroke="#ffb7c1" strokeLinecap="round" strokeWidth="7" />
        </motion.svg>
        <motion.h1
          initial={reduce ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto max-w-[21rem] text-[1.75rem] font-extrabold leading-tight text-forest [text-wrap:balance]"
        >
          {copy.funnel.notAlone.title}
        </motion.h1>
      </div>
      <div className="w-full pt-5">
        <PrimaryButton onClick={() => goToNextQuizStep(router, 'not_alone')}>{copy.funnel.notAlone.cta}</PrimaryButton>
      </div>
    </QuizStepFrame>
  );
}

/** The daily step goal on an iOS wheel, starting on a goal set from the visitor's age and job. */
export function StepGoalStep() {
  const router = useRouter();
  const copy = useCopy();
  const locale = useLocale();
  const data = useQuizStore((s) => s.data);
  const saved = useQuizStore((s) => s.planAnswers.stepGoal);
  const setPlanAnswers = useQuizStore((s) => s.setPlanAnswers);
  const recommended = recommendedStepGoal(data);
  const goal = saved ?? recommended;
  const text = copy.funnel.stepGoal;
  const format = new Intl.NumberFormat(locale === 'vi' ? 'vi-VN' : 'en-US');

  return (
    <QuizStepFrame title={text.title} className="gap-3">
      <div className="flex min-h-0 flex-1 flex-col">
        <MetricWheelPicker
          id="step-goal"
          label={text.title}
          value={goal}
          unit={text.unit}
          min={STEP_GOAL.min}
          max={STEP_GOAL.max}
          step={STEP_GOAL.step}
          onChange={(next) => setPlanAnswers({ stepGoal: next })}
          formatValue={(next) => format.format(next)}
          variant="hero"
        />
      </div>
      <div className={cn('flex gap-3 rounded-[1.1rem] p-3.5 transition-colors duration-300', goal === recommended ? 'bg-[#e9f7ef]' : 'bg-white/80')}>
        <span aria-hidden="true" className={cn('mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full text-white transition-colors duration-300', goal === recommended ? 'bg-[#34c759]' : 'bg-[#c7c7cc]')}>
          <svg viewBox="0 0 12 12" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m2.5 6.2 2.3 2.3 4.7-5" /></svg>
        </span>
        <p className="text-[0.86rem] leading-snug text-slate-brand">
          <span className="block font-extrabold text-forest">{text.recommendedTitle}: {format.format(recommended)} {text.unit}</span>
          {text.recommendedBody}
        </p>
      </div>
      <PrimaryButton onClick={() => { setPlanAnswers({ stepGoal: goal }); goToNextQuizStep(router, 'step_goal'); }}>{text.cta}</PrimaryButton>
    </QuizStepFrame>
  );
}
