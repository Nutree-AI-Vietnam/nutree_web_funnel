'use client';

import { useCopy, useLocale } from '@/lib/copy/use-copy';
import { firstChangePlan, planNumbers, sampleDay, type ChangeSource } from '@/lib/quiz/plan-content';
import { formatGoalDate, goalTimeline, type GoalTimeline } from '@/lib/quiz/progress-projection';
import { useQuizStore } from '@/lib/quiz/store';
import type { OnboardingPayload, TdeeResult } from '@/lib/quiz/types';
import { formatWeight, type UnitSystem } from '@/lib/quiz/units';
import { cn } from '@/lib/utils';

const CARD = 'rounded-[1.6rem] bg-white p-4 shadow-[0_18px_46px_rgb(23_69_58_/_0.08)] sm:p-5';

function numberLocale(locale: string) {
  return locale === 'vi' ? 'vi-VN' : 'en-US';
}

/** Straight path at the plan's weekly pace, with the week-1 and month-1 milestones on it. */
export function GoalChart({ timeline, system, nowLabel, week1Label, month1Label, goalLabel }: {
  timeline: GoalTimeline;
  system: UnitSystem;
  nowLabel: string;
  week1Label: string;
  month1Label: string;
  /** Under the goal end of the path, usually its date. */
  goalLabel?: string;
}) {
  const left = 26;
  const right = 300;
  const top = 26;
  const bottom = 112;
  const x = (day: number) => left + ((right - left) * Math.min(day, timeline.days)) / timeline.days;
  const y = (kg: number) => {
    const span = timeline.targetKg - timeline.currentKg;
    const share = span === 0 ? 0 : (kg - timeline.currentKg) / span;
    return timeline.reducing ? top + (bottom - top) * share : bottom - (bottom - top) * share;
  };
  const milestones = [
    { day: 7, kg: timeline.week1Kg, label: week1Label },
    { day: 30, kg: timeline.month1Kg, label: month1Label },
  ].filter((milestone) => milestone.day < timeline.days * 0.8);
  const start = { x: x(0), y: y(timeline.currentKg) };
  const end = { x: x(timeline.days), y: y(timeline.targetKg) };

  return (
    <svg viewBox="0 0 326 150" className="mt-3 h-auto w-full" role="img" aria-label={`${formatWeight(timeline.currentKg, system)} → ${formatWeight(timeline.targetKg, system)}`}>
      <defs>
        <linearGradient id="plan-fill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#1fa892" stopOpacity="0.22" />
          <stop offset="1" stopColor="#1fa892" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`M${start.x} ${start.y} L${end.x} ${end.y} L${end.x} 124 L${start.x} 124 Z`} fill="url(#plan-fill)" />
      <path d={`M${start.x} ${start.y} L${end.x} ${end.y}`} stroke="#238d78" strokeWidth="4" strokeLinecap="round" />
      <circle cx={start.x} cy={start.y} r="6" fill="#d7a84d" stroke="white" strokeWidth="3" />
      <text x={start.x + 10} y={start.y - 8} className="fill-slate-brand text-[11px] font-bold">{formatWeight(timeline.currentKg, system)}</text>
      {milestones.map((milestone) => (
        <circle key={milestone.label} cx={x(milestone.day)} cy={y(milestone.kg)} r="4.5" fill="#238d78" stroke="white" strokeWidth="2.5" />
      ))}
      <circle cx={end.x} cy={end.y} r="7" fill="#17453a" stroke="white" strokeWidth="3" />
      <text x={end.x} y={end.y - 12} textAnchor="end" className="fill-forest text-[12px] font-extrabold">{formatWeight(timeline.targetKg, system)}</text>
      <text x={start.x} y="142" textAnchor="start" className="fill-muted-brand text-[10px] font-bold">{nowLabel}</text>
      {goalLabel && <text x={end.x} y="142" textAnchor="end" className="fill-muted-brand text-[10px] font-bold">{goalLabel}</text>}
    </svg>
  );
}

/** The plan as one card: name, goal date, path, first win and the daily targets. */
export function PlanGoalCard({ data, tdee, system, className }: {
  data: OnboardingPayload;
  tdee: TdeeResult | null;
  system: UnitSystem;
  className?: string;
}) {
  const copy = useCopy();
  const locale = useLocale();
  const plan = copy.funnel.plan;
  const progress = copy.funnel.progress;
  const timeline = goalTimeline(data);
  const name = data.name?.trim();
  const format = new Intl.NumberFormat(numberLocale(locale));

  return (
    <section className={cn(CARD, className)}>
      <p className="text-[0.72rem] font-extrabold tracking-[0.08em] text-teal-brand">{name ? plan.eyebrow(name) : plan.eyebrowFallback}</p>
      <h2 className="mt-1 text-[1.5rem] font-extrabold leading-tight tracking-[-0.03em] text-forest">
        {timeline ? plan.goalHeadline(formatWeight(timeline.targetKg, system), formatGoalDate(timeline.date, locale)) : plan.steadyHeadline}
      </h2>
      {timeline && (
        <>
          <p className="mt-1 text-sm font-bold text-slate-brand">{plan.firstWin(formatWeight(timeline.week1Kg, system), formatGoalDate(timeline.week1Date, locale, false))}</p>
          <GoalChart timeline={timeline} system={system} nowLabel={plan.now} week1Label={progress.week1} month1Label={progress.month1} goalLabel={formatGoalDate(timeline.date, locale, false)} />
        </>
      )}
      {tdee && (
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="rounded-full bg-[#e8f4ef] px-3 py-1.5 text-sm font-extrabold text-forest">🔥 {plan.calories(format.format(Math.round(tdee.calories)))}</span>
          <span className="rounded-full bg-[#eef2fb] px-3 py-1.5 text-sm font-extrabold text-[#2b4a8b]">💪 {plan.protein(Math.round(tdee.protein_g))}</span>
        </div>
      )}
      <p className="mt-3 text-xs font-semibold text-muted-brand">{plan.estimate}</p>
    </section>
  );
}

/** Protein, carbs and fat as bars sized from the visitor's own targets. */
export function MacroBars({ tdee }: { tdee: TdeeResult }) {
  const copy = useCopy();
  const rows = [
    { label: copy.tdee_targets.protein, grams: Math.round(tdee.protein_g), kcal: tdee.protein_g * 4, color: 'bg-protein' },
    { label: copy.tdee_targets.carbs, grams: Math.round(tdee.carbs_g), kcal: tdee.carbs_g * 4, color: 'bg-carbs' },
    { label: copy.tdee_targets.fat, grams: Math.round(tdee.fat_g), kcal: tdee.fat_g * 9, color: 'bg-fat' },
  ];
  const total = rows.reduce((sum, row) => sum + row.kcal, 0) || 1;
  return (
    <div className="grid gap-2.5">
      {rows.map((row) => (
        <div key={row.label}>
          <div className="flex justify-between text-sm font-extrabold text-forest"><span>{row.label}</span><span>{row.grams} g</span></div>
          <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-forest/8"><div className={cn('h-full rounded-full', row.color)} style={{ width: `${Math.max(6, (row.kcal / total) * 100)}%` }} /></div>
        </div>
      ))}
    </div>
  );
}

/** Three first changes, each next to the answer it comes from. */
export function FirstChangesCard({ data, tdee, className }: { data: OnboardingPayload; tdee: TdeeResult; className?: string }) {
  const copy = useCopy();
  const answers = useQuizStore((state) => state.planAnswers);
  const plan = copy.funnel.plan;
  const said = copy.funnel.answers;
  const numbers = planNumbers(tdee);
  const sourceLabel = (source: ChangeSource) => {
    if (source.kind === 'moment') return copy.eating_pattern.options.find((option) => option.key === source.key)?.label ?? said.yourGoal;
    if (source.kind === 'challenge') return copy.challenges.options.find((option) => option.key === source.key)?.label ?? said.yourGoal;
    if (source.kind === 'cooking') return said.eatOut;
    return said.yourGoal;
  };
  return (
    <section className={cn(CARD, className)}>
      <h2 className="text-[1.12rem] font-extrabold tracking-[-0.02em] text-forest">{said.title}</h2>
      <ol className="mt-3 grid gap-4">
        {firstChangePlan(data, answers).map((change) => (
          <li key={change.id} className="border-l-[3px] border-teal-brand/70 pl-3.5">
            <p className="text-[0.78rem] font-bold text-muted-brand">
              {said.youSaid}: <span className="text-slate-brand">{sourceLabel(change.source)}</span>
            </p>
            <p className="mt-0.5 text-[1rem] font-extrabold leading-snug text-forest">{plan.changes[change.id].title}</p>
            <p className="mt-0.5 text-sm font-semibold leading-relaxed text-slate-brand">{plan.changes[change.id].body(numbers)}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

/**
 * The plan for one day as a plain card, not dressed as an app screen: calorie
 * target, macros, a day of meals for the diet answers, and the goal date.
 */
export function PlanDayCard({ data, tdee, system, className }: {
  data: OnboardingPayload;
  tdee: TdeeResult;
  system: UnitSystem;
  className?: string;
}) {
  const copy = useCopy();
  const locale = useLocale();
  const plan = copy.funnel.plan;
  const day = copy.funnel.day;
  const format = new Intl.NumberFormat(numberLocale(locale));
  const meals = sampleDay(tdee.calories, data.dietary_preferences);
  const total = meals.reduce((sum, row) => sum + row.calories, 0);
  const timeline = goalTimeline(data);
  const macros = [
    { label: copy.tdee_targets.protein, grams: Math.round(tdee.protein_g), kcal: tdee.protein_g * 4, color: '#e0803a' },
    { label: copy.tdee_targets.carbs, grams: Math.round(tdee.carbs_g), kcal: tdee.carbs_g * 4, color: '#1fa892' },
    { label: copy.tdee_targets.fat, grams: Math.round(tdee.fat_g), kcal: tdee.fat_g * 9, color: '#d7a84d' },
  ];
  const macroTotal = macros.reduce((sum, macro) => sum + macro.kcal, 0) || 1;

  return (
    <section className={cn(CARD, 'overflow-hidden p-0 sm:p-0', className)}>
      <div className="px-4 pb-4 pt-4 sm:px-5">
        <p className="text-sm font-extrabold text-teal-brand">{day.title}</p>
        <p className="mt-1 flex items-baseline gap-2">
          <span className="text-[2.6rem] font-extrabold leading-none tracking-[-0.04em] text-forest tabular-nums">{format.format(total)}</span>
          <span className="text-sm font-bold text-slate-brand">{day.kcal}</span>
        </p>
        <div className="mt-3 flex h-2.5 overflow-hidden rounded-full" aria-hidden="true">
          {macros.map((macro) => <span key={macro.label} style={{ width: `${(macro.kcal / macroTotal) * 100}%`, background: macro.color }} />)}
        </div>
        <ul className="mt-2 grid grid-cols-3 gap-2">
          {macros.map((macro) => (
            <li key={macro.label} className="text-sm">
              <span className="flex items-center gap-1.5 text-[0.74rem] font-bold text-muted-brand"><span aria-hidden="true" className="h-2 w-2 rounded-full" style={{ background: macro.color }} />{macro.label}</span>
              <span className="font-extrabold text-forest">{macro.grams} g</span>
            </li>
          ))}
        </ul>
      </div>
      <ul className="divide-y divide-border-brand/60 border-t border-border-brand/60 px-4 sm:px-5">
        {meals.map((row) => (
          <li key={row.meal} className="flex items-center justify-between gap-3 py-2.5">
            <span className="min-w-0">
              <span className="block text-[0.72rem] font-bold text-muted-brand">{plan.meals[row.meal]}</span>
              <span className="block text-[0.92rem] font-bold leading-snug text-forest">{plan.dishes[row.dish]}</span>
            </span>
            <span className="shrink-0 text-sm font-extrabold tabular-nums text-slate-brand">{format.format(row.calories)}</span>
          </li>
        ))}
      </ul>
      {timeline && (
        <div className="bg-forest px-4 py-3 text-white sm:px-5">
          <div className="flex items-baseline justify-between gap-3 text-sm font-bold">
            <span className="text-white/75">{formatWeight(timeline.currentKg, system)}</span>
            <span className="font-extrabold">{day.goal(formatWeight(timeline.targetKg, system), formatGoalDate(timeline.date, locale, false))}</span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/20"><div className="h-full w-[4%] rounded-full bg-[#e7a23a]" /></div>
        </div>
      )}
    </section>
  );
}
