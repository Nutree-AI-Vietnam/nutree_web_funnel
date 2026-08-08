'use client';

import { motion, useReducedMotion } from 'motion/react';
import { useRouter } from 'next/navigation';
import { PrimaryButton } from '@/components/primary-button';
import { useCopy } from '@/lib/copy/use-copy';
import { nextRoute } from '@/lib/quiz/steps';
import { useQuizStore } from '@/lib/quiz/store';
import { QuizStepFrame } from './quiz-step-frame';

export function ProgressStep() {
  const router = useRouter();
  const copy = useCopy();
  const reduce = useReducedMotion();
  const data = useQuizStore((state) => state.data);
  const current = data.weight_kg;
  const target = data.target_weight_kg;
  const hasProjection = current != null && target != null && Math.abs(current - target) > 0.5;
  const weeks = hasProjection ? Math.max(4, Math.ceil((Math.abs(current - target) / 0.5) * 7)) : 0;
  const reducing = hasProjection && target < current;

  return (
    <QuizStepFrame title={copy.progress.question} hint={copy.progress.hint} eyebrow={copy.progress.eyebrow}>
      {hasProjection ? (
        <section className="surface-grain relative overflow-hidden rounded-[1.7rem] bg-white/86 p-4 shadow-[0_18px_50px_rgb(26_71_57_/_0.11)]">
          <div className="absolute -right-8 -top-10 h-28 w-28 rounded-full bg-teal-brand/15 blur-2xl" />
          <svg viewBox="0 0 320 170" className="relative h-44 w-full" role="img" aria-label={copy.progress.chartLabel}>
            <defs>
              <linearGradient id="progress-fill" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0" stopColor="#1fa892" stopOpacity="0.24" />
                <stop offset="1" stopColor="#1fa892" stopOpacity="0" />
              </linearGradient>
            </defs>
            {[34, 72, 110, 148].map((y) => (
              <path key={y} d={`M24 ${y}H296`} stroke="#d9e7e1" strokeWidth="1.5" strokeDasharray="4 5" />
            ))}
            <path
              d={reducing ? 'M24 34 C 92 42, 145 78, 194 113 C 232 137, 263 146, 296 148 L296 158 L24 158 Z' : 'M24 148 C 92 140, 145 105, 194 72 C 232 48, 263 37, 296 34 L296 158 L24 158 Z'}
              fill="url(#progress-fill)"
            />
            <motion.path
              d={reducing ? 'M24 34 C 92 42, 145 78, 194 113 C 232 137, 263 146, 296 148' : 'M24 148 C 92 140, 145 105, 194 72 C 232 48, 263 37, 296 34'}
              fill="none"
              stroke="#238d78"
              strokeWidth="5"
              strokeLinecap="round"
              initial={reduce ? false : { pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={reduce ? { duration: 0 } : { duration: 1.1, ease: 'easeOut' }}
            />
            <circle cx="24" cy={reducing ? 34 : 148} r="7" fill="#238d78" stroke="white" strokeWidth="3" />
            <circle cx="296" cy={reducing ? 148 : 34} r="7" fill="#238d78" stroke="white" strokeWidth="3" />
            <text x="24" y="169" textAnchor="middle" className="fill-slate-brand text-[11px]">{copy.progress.startLabel}</text>
            <text x="160" y="169" textAnchor="middle" className="fill-slate-brand text-[11px]">{copy.progress.monthLabel}</text>
            <text x="296" y="169" textAnchor="middle" className="fill-slate-brand text-[11px]">{copy.progress.goalLabel}</text>
          </svg>
          <div className="mt-2 grid grid-cols-3 gap-2 text-center">
            <div>
              <div className="text-lg font-extrabold text-forest">{current} kg</div>
              <div className="text-xs font-semibold text-muted-brand">{copy.progress.startLabel}</div>
            </div>
            <div>
              <div className="text-lg font-extrabold text-slate-brand">{(current + (target - current) / 2).toFixed(1)} kg</div>
              <div className="text-xs font-semibold text-muted-brand">{copy.progress.monthNumber(2)}</div>
            </div>
            <div>
              <div className="text-lg font-extrabold text-teal-brand">{target} kg</div>
              <div className="text-xs font-semibold text-muted-brand">{copy.progress.goalLabel}</div>
            </div>
          </div>
          <p className="mt-4 text-center text-sm font-semibold leading-relaxed text-muted-brand">
            {copy.progress.weeks(weeks)}
          </p>
        </section>
      ) : (
        <section className="flex flex-1 flex-col items-center justify-center rounded-[1.7rem] bg-white/82 px-5 py-8 text-center shadow-[0_18px_50px_rgb(26_71_57_/_0.10)]">
          <div className="grid h-20 w-20 place-items-center rounded-full bg-teal-brand/12 text-4xl text-teal-brand">↗</div>
          <p className="mt-5 max-w-sm text-lg font-extrabold leading-tight text-forest">{copy.progress.noTarget}</p>
          <p className="mt-2 max-w-sm text-sm font-semibold leading-relaxed text-muted-brand">{copy.progress.noTargetHint}</p>
        </section>
      )}
      <p className="text-xs italic leading-relaxed text-muted-brand">{copy.progress.disclaimer}</p>
      <div className="mt-auto pt-2">
        <PrimaryButton onClick={() => router.push(nextRoute('progress'))}>{copy.progress.cta}</PrimaryButton>
      </div>
    </QuizStepFrame>
  );
}
