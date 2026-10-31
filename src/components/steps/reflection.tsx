'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { motion, useReducedMotion } from 'motion/react';
import { CARD } from '@/components/plan/plan-overview';
import { PrimaryButton } from '@/components/primary-button';
import { useCopy } from '@/lib/copy/use-copy';
import { reflectionHeadline, reflectionRows } from '@/lib/quiz/reflection';
import { goToNextQuizStep } from '@/lib/quiz/navigation';
import { useQuizStore } from '@/lib/quiz/store';
import { QuizStepFrame } from './quiz-step-frame';

export function ReflectionStep() {
  const router = useRouter();
  const copy = useCopy();
  const reduce = useReducedMotion();
  const data = useQuizStore((s) => s.data);
  const rows = reflectionRows(data, copy);

  return (
    <QuizStepFrame className="gap-5">
      {/* The outcome they asked for, as a picture; it settles in slowly, once. */}
      <motion.div
        initial={reduce ? false : { opacity: 0, scale: 1.08 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
        className="relative h-[11rem] shrink-0 overflow-hidden rounded-[1.7rem] shadow-[0_6px_16px_rgb(23_69_58_/_0.07)]"
      >
        <Image src="/images/illustrations/reflection-walk.jpg" alt="" fill priority sizes="(max-width: 512px) 100vw, 512px" className="object-cover object-center" />
      </motion.div>
      <p className="ph-mask max-w-[22rem] text-[1.7rem] font-extrabold leading-[1.2] tracking-tight text-forest [text-wrap:balance]">
        {reflectionHeadline(data, copy)}
      </p>

      {/* Each challenge picked on 04, next to what the plan does about it. */}
      {rows.length > 0 && (
        <section className={CARD}>
          <ol className="divide-y divide-border-brand/60">
            {rows.map((row, index) => {
              const delay = 0.15 + index * 0.12;
              return (
                <li key={row.key} className="py-3 first:pt-0 last:pb-0">
                  <motion.span
                    className="block text-[0.78rem] font-bold text-teal-brand"
                    initial={reduce ? false : { opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2, delay }}
                  >
                    {copy.funnel.answers.youSaid} {row.label.toLowerCase()}
                  </motion.span>
                  <motion.span
                    className="mt-0.5 block text-[1.05rem] font-extrabold leading-snug tracking-[-0.01em] text-forest"
                    initial={reduce ? false : { opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, ease: 'easeOut', delay: delay + 0.08 }}
                  >
                    {row.fix}
                  </motion.span>
                </li>
              );
            })}
          </ol>
        </section>
      )}

      <div className="mt-auto">
        <PrimaryButton onClick={() => goToNextQuizStep(router, 'reflection')}>
          {copy.reflection.cta}
        </PrimaryButton>
      </div>
    </QuizStepFrame>
  );
}
