'use client';

import { motion, useReducedMotion } from 'motion/react';
import { useRouter } from 'next/navigation';
import { PrimaryButton } from '@/components/primary-button';
import { useCopy, useLocale } from '@/lib/copy/use-copy';
import { goToNextQuizStep } from '@/lib/quiz/navigation';
import { GoalChart } from '@/components/plan/plan-overview';
import { buildProgressProjection, formatGoalDate, goalTimeline, type ProgressDirection } from '@/lib/quiz/progress-projection';
import { useQuizStore } from '@/lib/quiz/store';
import { formatWeight } from '@/lib/quiz/units';
import { useUnits } from '@/lib/quiz/use-units';
import { computeTdeeResult } from '@/lib/tdee/calculator';
import { QuizStepFrame } from './quiz-step-frame';

const CHARTS: Record<ProgressDirection, { line: string; area: string; startY: number; endY: number }> = {
  down: {
    line: 'M24 34 C 92 42, 145 78, 194 113 C 232 137, 263 146, 296 148',
    area: 'M24 34 C 92 42, 145 78, 194 113 C 232 137, 263 146, 296 148 L296 158 L24 158 Z',
    startY: 34,
    endY: 148,
  },
  up: {
    line: 'M24 148 C 92 140, 145 105, 194 72 C 232 48, 263 37, 296 34',
    area: 'M24 148 C 92 140, 145 105, 194 72 C 232 48, 263 37, 296 34 L296 158 L24 158 Z',
    startY: 148,
    endY: 34,
  },
  steady: {
    line: 'M24 92 C 90 84, 150 100, 210 92 C 250 86, 274 98, 296 92',
    area: 'M24 92 C 90 84, 150 100, 210 92 C 250 86, 274 98, 296 92 L296 158 L24 158 Z',
    startY: 92,
    endY: 92,
  },
};

export function ProgressStep() {
  const router = useRouter();
  const copy = useCopy();
  const locale = useLocale();
  const { system } = useUnits();
  const reduce = useReducedMotion();
  const data = useQuizStore((state) => state.data);
  const storedTdee = useQuizStore((state) => state.tdee);
  const projection = buildProgressProjection(data, storedTdee ?? computeTdeeResult(data));
  const direction: ProgressDirection = projection.kind === 'weight' ? (projection.reducing ? 'down' : 'up') : projection.direction;
  const chart = CHARTS[direction];
  const numberLocale = locale === 'vi' ? 'vi-VN' : 'en-US';
  const chartLabel = projection.kind === 'weight'
    ? copy.progress.chartLabel
    : copy.progress.chartLabelByDirection[direction];
  const pace = projection.kind === 'weight'
    ? copy.progress.pace(projection.days)
    : projection.calories != null && projection.proteinG != null
      ? copy.progress.planPace(projection.calories.toLocaleString(numberLocale), `${projection.proteinG}g`)
      : copy.progress.planPaceFallback;

  const timeline = goalTimeline(data);
  if (timeline) {
    const funnel = copy.funnel.progress;
    const target = formatWeight(timeline.targetKg, system);
    const date = formatGoalDate(timeline.date, locale);
    const name = data.name?.trim();
    const stats = [
      { label: funnel.week1, value: formatWeight(timeline.week1Kg, system), date: formatGoalDate(timeline.week1Date, locale, false), tone: 'text-forest', note: funnel.firstWin },
      { label: funnel.month1, value: formatWeight(timeline.month1Kg, system), date: formatGoalDate(timeline.month1Date, locale, false), tone: 'text-slate-brand' },
      { label: funnel.goal, value: target, date: formatGoalDate(timeline.date, locale, false), tone: 'text-teal-brand' },
    ];
    return (
      <QuizStepFrame title={name ? funnel.headline(name, target, date) : funnel.headlineNoName(target, date)} eyebrow={funnel.eyebrow}>
        <section className="surface-grain relative overflow-hidden rounded-[1.7rem] bg-white/86 p-4 shadow-[0_18px_50px_rgb(26_71_57_/_0.11)]">
          <GoalChart timeline={timeline} system={system} nowLabel={copy.funnel.plan.now} week1Label={funnel.week1} month1Label={funnel.month1} goalLabel={formatGoalDate(timeline.date, locale, false)} />
          <div className="mt-2 grid grid-cols-3 gap-2 text-center">
            {stats.map((stat) => (
              <div key={stat.label} className="rounded-2xl bg-mist/70 px-1.5 py-2">
                <div className={`text-lg font-extrabold leading-tight ${stat.tone}`}>{stat.value}</div>
                <div className="text-xs font-bold text-muted-brand">{stat.label}</div>
                <div className="text-[0.7rem] font-semibold text-muted-brand">{stat.date}</div>
                {stat.note && <div className="mt-0.5 text-[0.68rem] font-extrabold text-teal-brand">{stat.note}</div>}
              </div>
            ))}
          </div>
          <p className="mt-3 text-center text-sm font-semibold leading-relaxed text-muted-brand">
            {funnel.pace(system === 'imperial' ? funnel.rateImperial : funnel.rateMetric, timeline.weeks)}
          </p>
        </section>
        <p className="text-xs italic leading-relaxed text-muted-brand">{funnel.estimate}</p>
        <div className="mt-auto pt-2">
          <PrimaryButton onClick={() => goToNextQuizStep(router, 'progress')}>{copy.progress.cta}</PrimaryButton>
        </div>
      </QuizStepFrame>
    );
  }

  return (
    <QuizStepFrame title={copy.progress.question} hint={copy.progress.hint} eyebrow={copy.progress.eyebrow}>
      <section className="surface-grain relative overflow-hidden rounded-[1.7rem] bg-white/86 p-4 shadow-[0_18px_50px_rgb(26_71_57_/_0.11)]">
        <div className="absolute -right-8 -top-10 h-28 w-28 rounded-full bg-teal-brand/15 blur-2xl" />
        {projection.kind === 'plan' && (
          <p className="relative text-base font-extrabold leading-snug text-forest">{copy.progress.planHeadline[projection.goal]}</p>
        )}
        <svg viewBox="0 0 320 170" className="relative h-44 w-full" role="img" aria-label={chartLabel}>
          <defs>
            <linearGradient id="progress-fill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="#1fa892" stopOpacity="0.24" />
              <stop offset="1" stopColor="#1fa892" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[34, 72, 110, 148].map((y) => (
            <path key={y} d={`M24 ${y}H296`} stroke="#d9e7e1" strokeWidth="1.5" strokeDasharray="4 5" />
          ))}
          <path d={chart.area} fill="url(#progress-fill)" />
          <motion.path
            d={chart.line}
            fill="none"
            stroke="#238d78"
            strokeWidth="5"
            strokeLinecap="round"
            initial={reduce ? false : { pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={reduce ? { duration: 0 } : { duration: 1.1, ease: 'easeOut' }}
          />
          <circle cx="24" cy={chart.startY} r="7" fill="#238d78" stroke="white" strokeWidth="3" />
          <circle cx="296" cy={chart.endY} r="7" fill="#238d78" stroke="white" strokeWidth="3" />
          <text x="24" y="169" textAnchor="middle" className="fill-slate-brand text-[11px]">{copy.progress.startLabel}</text>
          <text x="160" y="169" textAnchor="middle" className="fill-slate-brand text-[11px]">{projection.kind === 'weight' ? copy.progress.monthLabel : copy.progress.habitLabel}</text>
          <text x="296" y="169" textAnchor="middle" className="fill-slate-brand text-[11px]">{projection.kind === 'weight' ? copy.progress.goalLabel : copy.progress.nextLabel}</text>
        </svg>
        {projection.kind === 'weight' ? (
          <div className="mt-2 grid grid-cols-3 gap-2 text-center">
            <div>
              <div className="text-lg font-extrabold text-forest">{formatWeight(projection.current, system)}</div>
              <div className="text-xs font-semibold text-muted-brand">{copy.progress.startLabel}</div>
            </div>
            <div>
              <div className="text-lg font-extrabold text-slate-brand">{formatWeight(projection.midpoint, system)}</div>
              <div className="text-xs font-semibold text-muted-brand">{copy.progress.monthNumber(2)}</div>
            </div>
            <div>
              <div className="text-lg font-extrabold text-teal-brand">{formatWeight(projection.target, system)}</div>
              <div className="text-xs font-semibold text-muted-brand">{copy.progress.goalLabel}</div>
            </div>
          </div>
        ) : (
          <div className="mt-2 grid grid-cols-3 gap-2 text-center">
            <div>
              <div className="text-lg font-extrabold text-forest">{projection.currentKg != null ? formatWeight(projection.currentKg, system) : copy.progress.missingStat}</div>
              <div className="text-xs font-semibold text-muted-brand">{copy.progress.currentStat}</div>
            </div>
            <div>
              <div className="text-lg font-extrabold text-slate-brand">{projection.calories != null ? projection.calories.toLocaleString(numberLocale) : copy.progress.missingStat}</div>
              <div className="text-xs font-semibold text-muted-brand">{copy.progress.caloriesStat}</div>
            </div>
            <div>
              <div className="text-lg font-extrabold text-teal-brand">{projection.trainingDays != null ? projection.trainingDays : copy.progress.missingStat}</div>
              <div className="text-xs font-semibold text-muted-brand">{copy.progress.trainingStat}</div>
            </div>
          </div>
        )}
        <p className="mt-4 text-center text-sm font-semibold leading-relaxed text-muted-brand">{pace}</p>
      </section>
      <p className="text-xs italic leading-relaxed text-muted-brand">{copy.progress.disclaimer}</p>
      <div className="mt-auto pt-2">
        <PrimaryButton onClick={() => goToNextQuizStep(router, 'progress')}>{copy.progress.cta}</PrimaryButton>
      </div>
    </QuizStepFrame>
  );
}
