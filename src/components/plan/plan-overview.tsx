'use client';

import { motion, useReducedMotion } from 'motion/react';
import type { ReactNode } from 'react';
import { CountUp } from '@/components/ui/count-up';
import { Icon } from '@/components/ui/icons';
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
  ].filter((milestone) => milestone.day < timeline.days * 0.8 && x(milestone.day) - x(0) >= 16);
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
          <span className="inline-flex items-center gap-1.5 rounded-full bg-mist px-3 py-1.5 text-sm font-extrabold text-forest"><Icon name="flame" className="h-4 w-4 text-teal-brand" />{plan.calories(format.format(Math.round(tdee.calories)))}</span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-mist px-3 py-1.5 text-sm font-extrabold text-forest"><span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-protein" />{plan.protein(Math.round(tdee.protein_g))}</span>
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

const MACRO_DOT = { protein: 'bg-protein', carbs: 'bg-carbs', fat: 'bg-fat' } as const;
const LABEL_EASE = [0.22, 1, 0.36, 1] as const;

/** A label rule that draws in from the left with the rest of the label. */
function LabelRule({ className }: { className: string }) {
  return (
    <motion.span
      aria-hidden="true"
      className={cn('block origin-left', className)}
      variants={{ hidden: { scaleX: 0 }, show: { scaleX: 1, transition: { duration: 0.5, ease: LABEL_EASE } } }}
    />
  );
}

/** A label row that rises into place after the rule above it. */
function LabelRow({ className, children }: { className: string; children: ReactNode }) {
  return (
    <motion.div className={className} variants={{ hidden: { opacity: 0, y: 6 }, show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } } }}>
      {children}
    </motion.div>
  );
}

function Grams({ value, className }: { value: ReactNode; className?: string }) {
  return (
    <span className={cn('whitespace-nowrap font-extrabold tabular-nums', className)}>
      {value}
      <span className="ml-1 text-[0.78rem] font-bold tracking-normal text-muted-brand">g</span>
    </span>
  );
}

/**
 * The day's targets set like a nutrition label: calories first and largest, protein second,
 * carbs and fat quiet. The rules draw in once as it scrolls into view; `countUp` also counts the
 * two numbers that matter, for the screen where they are first revealed. Screen readers get one sentence.
 */
export function DailyLabel({ tdee, size = 'lg', countUp = false, className }: {
  tdee: TdeeResult;
  /** lg: the result screen. sm: the plan card, under the paywall's dark goal strip, so it opens without a heavy rule. */
  size?: 'lg' | 'sm';
  countUp?: boolean;
  className?: string;
}) {
  const copy = useCopy();
  const locale = useLocale();
  const reduce = useReducedMotion();
  const labels = copy.tdee_targets;
  const format = (value: number) => new Intl.NumberFormat(numberLocale(locale)).format(Math.round(value));
  const calories = Math.round(tdee.calories);
  const protein = Math.round(tdee.protein_g);
  const carbs = Math.round(tdee.carbs_g);
  const fat = Math.round(tdee.fat_g);
  const lg = size === 'lg';
  const number = (value: number, delay: number, duration: number) => (countUp ? <CountUp value={value} format={format} delay={delay} duration={duration} /> : format(value));

  return (
    <div className={className}>
      <p className="sr-only">{labels.summary(format(calories), protein, carbs, fat)}</p>
      <motion.div
        aria-hidden="true"
        initial={reduce ? false : 'hidden'}
        whileInView="show"
        viewport={{ once: true, margin: '0px 0px -10% 0px' }}
        variants={{ show: { transition: { delayChildren: 0.05, staggerChildren: 0.09 } } }}
      >
        {lg && <LabelRule className="h-1.5 bg-forest" />}
        <LabelRow className={cn('flex items-end justify-between gap-3', lg ? 'py-3' : 'pb-2.5')}>
          <span className="min-w-0">
            <span className={cn('block font-extrabold leading-none tracking-[-0.02em] text-forest', lg ? 'text-[1.35rem]' : 'text-[1rem]')}>{labels.calories}</span>
            <span className={cn('mt-1.5 block font-semibold text-muted-brand', lg ? 'text-[0.8rem]' : 'text-[0.74rem]')}>{copy.funnel.day.kcal}</span>
          </span>
          <span className={cn('font-extrabold tracking-[-0.05em] text-forest tabular-nums', lg ? 'text-[clamp(2.75rem,16vw,3.75rem)] leading-[0.8]' : 'text-[2.1rem] leading-[0.85]')}>
            {number(calories, 0.25, 1.3)}
          </span>
        </LabelRow>
        <LabelRule className="h-0.5 bg-forest" />
        <LabelRow className={cn('flex items-baseline justify-between gap-3', lg ? 'py-3' : 'py-2.5')}>
          <span className={cn('flex items-center gap-2 font-extrabold text-forest', lg ? 'text-[1.05rem]' : 'text-[0.95rem]')}>
            <span className={cn('h-2.5 w-2.5 shrink-0 rounded-full', MACRO_DOT.protein)} />
            {labels.protein}
          </span>
          <Grams value={number(protein, 0.55, 0.8)} className={cn('tracking-[-0.03em] text-forest', lg ? 'text-[2.25rem] leading-none' : 'text-[1.35rem] leading-none')} />
        </LabelRow>
        <LabelRule className="h-px bg-forest/15" />
        {lg ? (
          (['carbs', 'fat'] as const).map((key, index) => (
            <div key={key}>
              {index > 0 && <LabelRule className="h-px bg-forest/15" />}
              <LabelRow className="flex items-baseline justify-between gap-3 py-2.5">
                <span className="flex items-center gap-2 text-[0.95rem] font-semibold text-slate-brand">
                  <span className={cn('h-2.5 w-2.5 shrink-0 rounded-full', MACRO_DOT[key])} />
                  {labels[key]}
                </span>
                <Grams value={format(key === 'carbs' ? carbs : fat)} className="text-[1rem] text-slate-brand" />
              </LabelRow>
            </div>
          ))
        ) : (
          <LabelRow className="flex flex-wrap items-center gap-x-5 gap-y-1 py-2 text-[0.82rem] font-semibold text-slate-brand">
            {(['carbs', 'fat'] as const).map((key) => (
              <span key={key} className="flex items-center gap-2">
                <span className={cn('h-2 w-2 shrink-0 rounded-full', MACRO_DOT[key])} />
                {labels[key]}
                <Grams value={format(key === 'carbs' ? carbs : fat)} className="font-bold text-forest" />
              </span>
            ))}
          </LabelRow>
        )}
      </motion.div>
    </div>
  );
}

/**
 * The plan for one day as a plain card, not dressed as an app screen: the targets as a
 * compact label, then a day of meals for the diet answers that adds up to the calorie target.
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

  return (
    <section className={cn(CARD, className)}>
      <DailyLabel tdee={tdee} size="sm" />
      <div className="mt-1 flex items-baseline justify-between gap-3 border-t-2 border-forest pt-3">
        <h3 className="text-[0.95rem] font-extrabold text-forest">{day.title}</h3>
        <span className="text-[0.72rem] font-bold text-muted-brand">kcal</span>
      </div>
      <ul className="mt-1.5 grid gap-1">
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
      <p className="mt-1.5 flex items-baseline justify-between gap-3 border-t-2 border-forest pt-2.5 text-forest">
        <span className="text-[0.9rem] font-extrabold">{day.total}</span>
        <span className="text-[1rem] font-extrabold tabular-nums">{format.format(total)}</span>
      </p>
    </section>
  );
}
