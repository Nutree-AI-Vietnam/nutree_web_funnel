'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { motion, useReducedMotion } from 'motion/react';
import { CARD } from '@/components/plan/plan-overview';
import { PrimaryButton } from '@/components/primary-button';
import { useCopy, useLocale } from '@/lib/copy/use-copy';
import { reflectionHeadline, reflectionRows, reflectionSummary } from '@/lib/quiz/reflection';
import { goToNextQuizStep } from '@/lib/quiz/navigation';
import { useQuizStore } from '@/lib/quiz/store';
import { QuizStepFrame } from './quiz-step-frame';

/** Vietnamese keeps the summary reflection (sentence, rising path, three answers); English answers each challenge. */
export function ReflectionStep() {
  return useLocale() === 'vi' ? <SummaryReflection /> : <ChallengeReflection />;
}

function SummaryReflection() {
  const router = useRouter();
  const copy = useCopy();
  const reduce = useReducedMotion();
  const data = useQuizStore((s) => s.data);
  const text = copy.reflection.summary;
  const summary = reflectionSummary(data, copy);
  const tiles = [
    { caption: text.goalCaption, value: summary.goal },
    { caption: text.challengeCaption, value: summary.challenge },
    { caption: text.reasonCaption, value: summary.reason },
  ];

  return (
    <QuizStepFrame className="gap-5">
      <p className="ph-mask max-w-[22rem] text-[1.7rem] font-extrabold leading-[1.2] tracking-tight text-forest [text-wrap:balance]">
        {text.headline(summary.name)}
      </p>
      <p className="max-w-[24rem] text-base font-semibold leading-snug text-slate-brand">{text.description}</p>

      {/* A path that draws itself from today to the goal. */}
      <section className="surface-grain relative overflow-hidden rounded-[1.7rem] bg-white/82 p-4 shadow-[0_6px_16px_rgb(16_39_32_/_0.07),inset_0_1px_0_rgb(255_255_255_/_0.82)] backdrop-blur">
        <div aria-hidden="true" className="absolute -right-8 -top-10 h-28 w-28 rounded-full bg-teal-brand/15 blur-2xl" />
        <div className="relative mb-1 flex items-center justify-between text-[0.72rem] font-extrabold tracking-[0.02em]">
          <span className="text-muted-brand">{text.todayLabel}</span>
          <span className="text-teal-brand">{summary.goal}</span>
        </div>
        <svg viewBox="0 0 320 120" className="relative h-28 w-full" role="img" aria-label={text.chartLabel}>
          <defs>
            <linearGradient id="reflect-fill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#1fa892" stopOpacity="0.24" />
              <stop offset="100%" stopColor="#1fa892" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="reflect-stroke" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0%" stopColor="#17453a" />
              <stop offset="100%" stopColor="#34d0b4" />
            </linearGradient>
          </defs>
          <path d="M16 104h288" stroke="#d4e5de" strokeWidth="2" strokeLinecap="round" />
          <motion.path
            d="M20 100 C 96 96, 150 74, 210 50 C 252 34, 280 26, 300 22 L300 104 L20 104 Z"
            fill="url(#reflect-fill)"
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.6 }}
          />
          <motion.path
            d="M20 100 C 96 96, 150 74, 210 50 C 252 34, 280 26, 300 22"
            fill="none"
            stroke="url(#reflect-stroke)"
            strokeWidth="5"
            strokeLinecap="round"
            initial={reduce ? false : { pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.1, ease: 'easeOut' }}
          />
          <circle cx="20" cy="100" r="4.5" fill="#17453a" />
          <motion.g initial={reduce ? false : { opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 1.0, duration: 0.3 }} style={{ transformOrigin: '300px 22px' }}>
            <circle cx="300" cy="22" r="7" fill="#1fa892" />
            <circle cx="300" cy="22" r="12" fill="none" stroke="#1fa892" strokeOpacity="0.35" strokeWidth="2" />
          </motion.g>
        </svg>
        <p className="relative mt-1 text-center text-xs font-semibold text-muted-brand">{text.caption}</p>
      </section>

      <div className="grid grid-cols-3 gap-2">
        {tiles.map((tile) => (
          <div key={tile.caption} className="flex min-h-[4.25rem] flex-col rounded-2xl bg-white/72 px-2.5 py-2.5 text-center shadow-[inset_0_0_0_1px_rgb(255_255_255_/_0.5),0_2px_8px_rgb(16_39_32_/_0.05)] backdrop-blur">
            <div className="text-[0.58rem] font-bold tracking-[0.02em] text-muted-brand">{tile.caption}</div>
            <div className="mt-1 flex flex-1 items-center justify-center text-[0.78rem] font-extrabold leading-tight text-forest [text-wrap:balance]">{tile.value}</div>
          </div>
        ))}
      </div>

      <div className="mt-auto">
        <PrimaryButton onClick={() => goToNextQuizStep(router, 'reflection')}>{copy.reflection.cta}</PrimaryButton>
      </div>
    </QuizStepFrame>
  );
}

function ChallengeReflection() {
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
        <Image src="/images/reflection-walk.webp" alt="" fill priority sizes="(max-width: 512px) 100vw, 512px" className="object-cover object-[70%_30%]" />
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
