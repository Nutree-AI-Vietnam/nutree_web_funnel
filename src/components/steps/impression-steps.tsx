'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { motion, useReducedMotion } from 'motion/react';
import { PrimaryButton } from '@/components/primary-button';
import { useCopy } from '@/lib/copy/use-copy';
import { goToNextQuizStep } from '@/lib/quiz/navigation';
import { useQuizStore } from '@/lib/quiz/store';
import { cn } from '@/lib/utils';
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
        className="relative h-[9.5rem] shrink-0 overflow-hidden rounded-[1.7rem] shadow-[0_18px_46px_rgb(23_69_58_/_0.16)]"
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
        className="rounded-[1.7rem] bg-white/92 p-4 shadow-[0_24px_72px_rgb(26_71_57_/_0.13),inset_0_1px_0_rgb(255_255_255_/_0.82)] backdrop-blur"
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
