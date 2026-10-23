'use client';

import { motion, useReducedMotion } from 'motion/react';
import type { ReactNode } from 'react';
import { useCopy, useLocale } from '@/lib/copy/use-copy';
import { firstChangePlan, planNumbers, sampleDay, type ChangeSource, type DishId, type Meal } from '@/lib/quiz/plan-content';
import { formatGoalDate, goalTimeline, type GoalTimeline } from '@/lib/quiz/progress-projection';
import { useQuizStore } from '@/lib/quiz/store';
import type { OnboardingPayload, TdeeResult } from '@/lib/quiz/types';
import { formatWeight, type UnitSystem } from '@/lib/quiz/units';
import { cn } from '@/lib/utils';

const CARD = 'rounded-[1.6rem] bg-white p-4 shadow-[0_18px_46px_rgb(23_69_58_/_0.08)] sm:p-5';

/** Text that clears from the email screen's blur, once, as the unlocked plan first appears. */
function Reveal({ on, index, children }: { on?: boolean; index: number; children: ReactNode }) {
  const reduce = useReducedMotion();
  if (!on || reduce) return <>{children}</>;
  return (
    <motion.span
      className="inline-block"
      initial={{ filter: 'blur(4px)', opacity: 0.45 }}
      animate={{ filter: 'blur(0px)', opacity: 1 }}
      transition={{ delay: 0.25 + index * 0.08, duration: 0.45, ease: 'easeOut' }}
    >
      {children}
    </motion.span>
  );
}

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

/**
 * The goal as the paywall's one dark surface: where you are, where you're going and the
 * path between, drawn in once. Renders nothing without a weight goal.
 */
export function GoalStrip({ data, system, className }: { data: OnboardingPayload; system: UnitSystem; className?: string }) {
  const copy = useCopy();
  const locale = useLocale();
  const reduce = useReducedMotion();
  const plan = copy.funnel.plan;
  const progress = copy.funnel.progress;
  const timeline = goalTimeline(data);
  if (!timeline) return null;
  const path = timeline.reducing ? 'M8 14 C 120 22, 210 52, 318 62' : 'M8 62 C 120 54, 210 24, 318 14';
  const end = timeline.reducing ? { x: 318, y: 62 } : { x: 318, y: 14 };

  return (
    <section className={cn('rounded-[1.6rem] bg-forest p-4 text-white shadow-[0_18px_46px_rgb(23_69_58_/_0.22)] sm:p-5', className)}>
      <div className="flex items-end justify-between gap-3">
        <p>
          <span className="block text-[0.72rem] font-bold text-white/65">{plan.now}</span>
          <span className="block text-[1.35rem] font-extrabold leading-tight tabular-nums">{formatWeight(timeline.currentKg, system)}</span>
        </p>
        <p className="text-right">
          <span className="block text-[0.72rem] font-bold text-white/65">{progress.goal}</span>
          <span className="block text-[1.35rem] font-extrabold leading-tight tabular-nums text-teal-bright">{formatWeight(timeline.targetKg, system)}</span>
          <span className="block whitespace-nowrap text-[0.74rem] font-bold text-white/75">{formatGoalDate(timeline.date, locale)}</span>
        </p>
      </div>
      <svg viewBox="0 0 326 76" className="mt-2 h-auto w-full" aria-hidden="true">
        <defs>
          <linearGradient id="goal-strip-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#34d0b4" stopOpacity="0.28" />
            <stop offset="1" stopColor="#34d0b4" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={`${path} L318 76 L8 76 Z`} fill="url(#goal-strip-fill)" />
        <motion.path
          d={path}
          fill="none"
          stroke="#34d0b4"
          strokeWidth="4"
          strokeLinecap="round"
          initial={reduce ? false : { pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
        />
        <circle cx="8" cy={timeline.reducing ? 14 : 62} r="5" fill="#d7a84d" stroke="#17453a" strokeWidth="2.5" />
        <motion.circle
          cx={end.x}
          cy={end.y}
          r="6.5"
          fill="#34d0b4"
          stroke="#17453a"
          strokeWidth="3"
          initial={reduce ? false : { scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.95, duration: 0.3 }}
          style={{ transformOrigin: `${end.x}px ${end.y}px` }}
        />
      </svg>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="rounded-full bg-white/12 px-2.5 py-1 text-[0.8rem] font-bold">{plan.firstWin(formatWeight(timeline.week1Kg, system), formatGoalDate(timeline.week1Date, locale, false))}</span>
        <span className="text-[0.72rem] font-semibold text-white/60">{plan.estimate}</span>
      </div>
    </section>
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

/** Three first changes, each next to the answer it comes from. */
export function FirstChangesCard({ data, tdee, className, reveal }: { data: OnboardingPayload; tdee: TdeeResult; className?: string; reveal?: boolean }) {
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
      <ol className="mt-3 divide-y divide-border-brand/60">
        {firstChangePlan(data, answers).map((change, index) => (
          <li key={change.id} className="grid grid-cols-[1.75rem_1fr] gap-3 py-3 first:pt-0 last:pb-0">
            <span className="grid h-7 w-7 place-items-center rounded-full bg-mist text-[0.8rem] font-extrabold text-forest">{index + 1}</span>
            <span>
              <span className="block text-[0.76rem] font-bold text-teal-brand">{said.youSaid} {sourceLabel(change.source).toLowerCase()}</span>
              <span className="mt-0.5 block text-[0.98rem] font-extrabold leading-snug text-forest"><Reveal on={reveal} index={index + 4}>{plan.changes[change.id].title(numbers)}</Reveal></span>
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}

const MEAL_TINT: Record<Meal, string> = { breakfast: '#fff1df', lunch: '#e5f4ee', snack: '#fde9ec', dinner: '#e9eefb' };
const DISH_ICON: Record<DishId, string> = {
  eggs_toast: '🍳',
  yogurt_oats: '🥣',
  tofu_scramble: '🥔',
  chia_pudding: '🫐',
  chicken_rice_bowl: '🍚',
  tuna_salad: '🥗',
  chickpea_quinoa: '🥗',
  salmon_potatoes: '🐟',
  beef_stir_fry: '🥢',
  lentil_curry: '🍛',
  apple_peanut_butter: '🍎',
  yogurt_berries: '🍓',
  hummus_carrots: '🥕',
};

/** Protein, carbs and fat with their share of the day's calories, in the ring's colours. */
export function macroShares(tdee: TdeeResult, labels: { protein: string; carbs: string; fat: string }) {
  const macros = [
    { label: labels.protein, grams: Math.round(tdee.protein_g), kcal: tdee.protein_g * 4, color: 'var(--color-protein)' },
    { label: labels.carbs, grams: Math.round(tdee.carbs_g), kcal: tdee.carbs_g * 4, color: 'var(--color-carbs)' },
    { label: labels.fat, grams: Math.round(tdee.fat_g), kcal: tdee.fat_g * 9, color: 'var(--color-fat)' },
  ];
  const total = macros.reduce((sum, macro) => sum + macro.kcal, 0) || 1;
  return macros.map((macro) => ({ ...macro, share: macro.kcal / total }));
}

/** The day's calories as a ring split by where they come from: protein, carbs and fat. */
export function CalorieRing({ total, unit, macros, draw = false }: {
  total: string;
  unit: string;
  macros: ReadonlyArray<{ label: string; share: number; color: string }>;
  /** Draw the segments in one after another, for the first reveal of the numbers. */
  draw?: boolean;
}) {
  const reduce = useReducedMotion();
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const gap = 5;
  const starts = macros.map((_, index) => macros.slice(0, index).reduce((sum, macro) => sum + macro.share, 0) * circumference);
  return (
    <div className="relative h-[7.25rem] w-[7.25rem] shrink-0">
      <svg viewBox="0 0 128 128" className="h-full w-full -rotate-90" aria-hidden="true">
        <circle cx="64" cy="64" r={radius} fill="none" stroke="#eef4f1" strokeWidth="12" />
        {macros.map((macro, index) => {
          const length = Math.max(0, macro.share * circumference - gap);
          return draw && !reduce ? (
            <motion.circle
              key={macro.label}
              cx="64"
              cy="64"
              r={radius}
              fill="none"
              stroke={macro.color}
              strokeWidth="12"
              strokeLinecap="round"
              strokeDashoffset={-starts[index]}
              initial={{ strokeDasharray: `0 ${circumference}` }}
              animate={{ strokeDasharray: `${length} ${circumference}` }}
              transition={{ delay: 0.2 + index * 0.35, duration: 0.55, ease: 'easeOut' }}
            />
          ) : (
            <circle key={macro.label} cx="64" cy="64" r={radius} fill="none" stroke={macro.color} strokeWidth="12" strokeLinecap="round" strokeDasharray={`${length} ${circumference}`} strokeDashoffset={-starts[index]} />
          );
        })}
      </svg>
      <p className="absolute inset-0 grid place-content-center text-center">
        <span className="text-[1.6rem] font-extrabold leading-none tracking-[-0.04em] text-forest tabular-nums">{total}</span>
        <span className="mt-1 text-[0.68rem] font-bold leading-tight text-muted-brand">{unit}</span>
      </p>
    </div>
  );
}

/**
 * The plan for one day as a plain card, not dressed as an app screen: the
 * calorie target as a ring with its macros, then a day of meals for the diet answers.
 */
export function PlanDayCard({ data, tdee, className, reveal }: {
  data: OnboardingPayload;
  tdee: TdeeResult;
  className?: string;
  /** Unblur the meal names once, as on the screen right after the email. */
  reveal?: boolean;
}) {
  const copy = useCopy();
  const locale = useLocale();
  const plan = copy.funnel.plan;
  const day = copy.funnel.day;
  const format = new Intl.NumberFormat(numberLocale(locale));
  const meals = sampleDay(tdee.calories, data.dietary_preferences);
  const total = meals.reduce((sum, row) => sum + row.calories, 0);
  const shares = macroShares(tdee, copy.tdee_targets);

  return (
    <section className={cn(CARD, className)} aria-label={`${format.format(total)} ${day.kcal}`}>
      <div className="flex items-center gap-4 sm:gap-6">
        <CalorieRing total={format.format(total)} unit={day.kcal} macros={shares} />
        <ul className="grid min-w-0 flex-1 gap-2.5">
          {shares.map((macro) => (
            <li key={macro.label} className="flex items-center gap-2 text-[0.9rem]">
              <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: macro.color }} />
              <span className="min-w-0 flex-1 whitespace-nowrap font-bold text-slate-brand">{macro.label}</span>
              <span className="whitespace-nowrap font-extrabold tabular-nums text-forest">{macro.grams} g</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="mt-5 flex items-baseline justify-between gap-3">
        <h3 className="text-[0.95rem] font-extrabold text-forest">{day.title}</h3>
        <span className="text-[0.72rem] font-bold text-muted-brand">kcal</span>
      </div>
      <ul className="mt-2 grid gap-1.5">
        {meals.map((row, index) => (
          <li key={row.meal} className="flex items-center gap-3 py-1.5">
            <span aria-hidden="true" className="grid h-10 w-10 shrink-0 place-items-center rounded-[0.85rem] text-[1.25rem]" style={{ background: MEAL_TINT[row.meal] }}>{DISH_ICON[row.dish]}</span>
            <span className="min-w-0 flex-1">
              <span className="block text-[0.9rem] font-extrabold leading-snug text-forest"><Reveal on={reveal} index={index}>{plan.dishes[row.dish]}</Reveal></span>
              <span className="block text-[0.76rem] font-semibold text-muted-brand">{plan.meals[row.meal]}</span>
            </span>
            <span className="shrink-0 text-[0.9rem] font-extrabold tabular-nums text-slate-brand">{format.format(row.calories)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
