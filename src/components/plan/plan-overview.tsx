'use client';

import { motion, useReducedMotion } from 'motion/react';
import type { ReactNode } from 'react';
import { CountUp } from '@/components/ui/count-up';
import { Icon, type IconName } from '@/components/ui/icons';
import { AppleMark, GooglePlayMark } from '@/components/value-tour/value-tour-demos';
import { useCopy, useLocale } from '@/lib/copy/use-copy';
import { appIncludeSources, firstChangePlan, planNumbers, sampleDay, type ChangeSource } from '@/lib/quiz/plan-content';
import { formatGoalDate, goalTimeline, type GoalTimeline } from '@/lib/quiz/progress-projection';
import { useQuizStore } from '@/lib/quiz/store';
import type { OnboardingPayload, TdeeResult } from '@/lib/quiz/types';
import { formatWeight, type UnitSystem } from '@/lib/quiz/units';
import { cn } from '@/lib/utils';

/** The plain white plan card; reflection (07) reuses it so its rows read as part of the same plan. */
export const CARD = 'rounded-[1.6rem] bg-white p-4 shadow-[0_18px_46px_rgb(23_69_58_/_0.08)] sm:p-5';

/** Text that clears from the email screen's blur, once, as the unlocked plan first appears. */
function Reveal({ on, index, className, children }: { on?: boolean; index: number; className?: string; children: ReactNode }) {
  const reduce = useReducedMotion();
  if (!on || reduce) return <>{children}</>;
  return (
    <motion.span
      className={cn('inline-block', className)}
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
export function GoalChart({ timeline, system, nowLabel, week1Label, month1Label, goalLabel, animate = false }: {
  timeline: GoalTimeline;
  system: UnitSystem;
  nowLabel: string;
  week1Label: string;
  month1Label: string;
  /** Under the goal end of the path, usually its date. */
  goalLabel?: string;
  /** Draw the path in once, then land the goal dot with one pulse (the progress screen only). */
  animate?: boolean;
}) {
  const locale = useLocale();
  const reduce = useReducedMotion();
  const play = animate && !reduce;
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
  // A curve that moves fastest early and eases into the goal, the way real progress tends to read.
  const c1 = { x: start.x + (end.x - start.x) * 0.3, y: start.y + (end.y - start.y) * 0.72 };
  const c2 = { x: start.x + (end.x - start.x) * 0.62, y: end.y };
  const bezier = (t: number, a: number, b: number, c: number, d: number) => (1 - t) ** 3 * a + 3 * (1 - t) ** 2 * t * b + 3 * (1 - t) * t ** 2 * c + t ** 3 * d;
  const onCurve = (px: number) => {
    let lo = 0;
    let hi = 1;
    for (let i = 0; i < 24; i += 1) {
      const mid = (lo + hi) / 2;
      if (bezier(mid, start.x, c1.x, c2.x, end.x) < px) lo = mid;
      else hi = mid;
    }
    return bezier(lo, start.y, c1.y, c2.y, end.y);
  };
  const curve = `M${start.x} ${start.y} C${c1.x} ${c1.y} ${c2.x} ${c2.y} ${end.x} ${end.y}`;

  return (
    <svg viewBox="0 0 326 150" className="mt-3 h-auto w-full" role="img" aria-label={`${formatWeight(timeline.currentKg, system, locale)} → ${formatWeight(timeline.targetKg, system, locale)}`}>
      <defs>
        <linearGradient id="plan-fill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#1fa892" stopOpacity="0.22" />
          <stop offset="1" stopColor="#1fa892" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="plan-line" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#d7a84d" />
          <stop offset="0.45" stopColor="#1fa892" />
          <stop offset="1" stopColor="#17453a" />
        </linearGradient>
      </defs>
      <motion.path
        d={`${curve} L${end.x} 124 L${start.x} 124 Z`}
        fill="url(#plan-fill)"
        initial={play ? { opacity: 0 } : false}
        animate={play ? { opacity: 1 } : undefined}
        transition={{ duration: 0.5, delay: 0.5 }}
      />
      <motion.path
        d={curve}
        fill="none"
        stroke="url(#plan-line)"
        strokeWidth="4.5"
        strokeLinecap="round"
        initial={play ? { pathLength: 0 } : false}
        animate={play ? { pathLength: 1 } : undefined}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
      />
      <circle cx={start.x} cy={start.y} r="6" fill="#d7a84d" stroke="white" strokeWidth="3" />
      <text x={start.x + 10} y={start.y - 8} className="fill-slate-brand text-[11px] font-bold">{formatWeight(timeline.currentKg, system, locale)}</text>
      {milestones.map((milestone) => (
        <circle key={milestone.label} cx={x(milestone.day)} cy={onCurve(x(milestone.day))} r="4.5" fill="#238d78" stroke="white" strokeWidth="2.5" />
      ))}
      {play && (
        // One pulse once the goal dot has landed; hidden until then, so no ring waits ahead of the line.
        <motion.circle
          cx={end.x}
          cy={end.y}
          r="7"
          fill="none"
          stroke="#238d78"
          strokeWidth="2"
          initial={{ scale: 1, opacity: 0 }}
          animate={{ scale: 2.2, opacity: [0, 0.35, 0] }}
          transition={{ duration: 0.8, delay: 1.15, opacity: { duration: 0.8, delay: 1.15, times: [0, 0.01, 1] } }}
          style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
        />
      )}
      <motion.circle
        cx={end.x}
        cy={end.y}
        r="7"
        fill="#17453a"
        stroke="white"
        strokeWidth="3"
        initial={play ? { scale: 0 } : false}
        animate={play ? { scale: 1 } : undefined}
        transition={{ delay: 0.95, duration: 0.3 }}
        style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
      />
      <text x={end.x} y={end.y - 12} textAnchor="end" className="fill-forest text-[12px] font-extrabold">{formatWeight(timeline.targetKg, system, locale)}</text>
      <text x={start.x} y="142" textAnchor="start" className="fill-muted-brand text-[10px] font-bold">{nowLabel}</text>
      {goalLabel && <text x={end.x} y="142" textAnchor="end" className="fill-muted-brand text-[10px] font-bold">{goalLabel}</text>}
    </svg>
  );
}

/**
 * The goal as the paywall's one dark surface: where you are, where you're going and the
 * path between, drawn in once. With `targets`, the day's calories and protein close it, so
 * the paywall recaps the plan in one card. Renders nothing without a weight goal.
 */
export function GoalStrip({ data, system, targets, className }: {
  data: OnboardingPayload;
  system: UnitSystem;
  targets?: { calories: number; proteinG: number };
  className?: string;
}) {
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
          <span className="block text-[1.35rem] font-extrabold leading-tight tabular-nums">{formatWeight(timeline.currentKg, system, locale)}</span>
        </p>
        <p className="text-right">
          <span className="block text-[0.72rem] font-bold text-white/65">{progress.goal}</span>
          <span className="block text-[1.35rem] font-extrabold leading-tight tabular-nums text-teal-bright">{formatWeight(timeline.targetKg, system, locale)}</span>
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
        <span className="rounded-full bg-white/12 px-2.5 py-1 text-[0.8rem] font-bold">{plan.firstWin(formatWeight(timeline.week1Kg, system, locale), formatGoalDate(timeline.week1Date, locale, false))}</span>
        <span className="text-[0.72rem] font-semibold text-white/60">{plan.estimate}</span>
      </div>
      {targets && (
        // Rises in once the goal dot has landed.
        <motion.div
          className="mt-3 grid grid-cols-2 divide-x divide-white/15 border-t border-white/15 pt-3"
          initial={reduce ? false : { opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1, duration: 0.3 }}
        >
          <p className="pr-3">
            <span className="block text-[1.35rem] font-extrabold leading-none tabular-nums text-white">{new Intl.NumberFormat(numberLocale(locale)).format(Math.round(targets.calories))}</span>
            <span className="mt-1 block text-[0.72rem] font-bold text-white/70">{plan.kcalADay}</span>
          </p>
          <p className="pl-3">
            <span className="block text-[1.35rem] font-extrabold leading-none tabular-nums text-white">{`${Math.round(targets.proteinG)} g`}</span>
            <span className="mt-1 block text-[0.72rem] font-bold text-white/70">{plan.proteinADay}</span>
          </p>
        </motion.div>
      )}
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
        {timeline ? plan.goalHeadline(formatWeight(timeline.targetKg, system, locale), formatGoalDate(timeline.date, locale)) : plan.steadyHeadline}
      </h2>
      {timeline && (
        <>
          <p className="mt-1 text-sm font-bold text-slate-brand">{plan.firstWin(formatWeight(timeline.week1Kg, system, locale), formatGoalDate(timeline.week1Date, locale, false))}</p>
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

/** "You said rushed mornings": the answer a first change comes from, as one line. The email teaser shows it too. */
export function useChangeSourceLine(): (source: ChangeSource) => string {
  const copy = useCopy();
  const said = copy.funnel.answers;
  const sourceLabel = (source: ChangeSource) => {
    if (source.kind === 'moment') return copy.eating_pattern.options.find((option) => option.key === source.key)?.label ?? said.yourGoal;
    if (source.kind === 'challenge') return copy.challenges.options.find((option) => option.key === source.key)?.label ?? said.yourGoal;
    if (source.kind === 'cooking') return said.eatOut;
    return said.yourGoal;
  };
  return (source) => `${said.youSaid} ${sourceLabel(source).toLowerCase()}`;
}

/** Three first changes, each under the answer it comes from. */
export function FirstChangesCard({ data, tdee, className, reveal }: { data: OnboardingPayload; tdee: TdeeResult; className?: string; reveal?: boolean }) {
  const copy = useCopy();
  const answers = useQuizStore((state) => state.planAnswers);
  const sourceLine = useChangeSourceLine();
  const plan = copy.funnel.plan;
  const numbers = planNumbers(tdee);
  return (
    <section className={cn(CARD, className)}>
      <h2 className="text-[1.12rem] font-extrabold tracking-[-0.02em] text-forest">{copy.funnel.answers.title}</h2>
      <ol className="mt-3 divide-y divide-border-brand/60">
        {firstChangePlan(data, answers).map((change, index) => (
          <li key={change.id} className="py-3 first:pt-0 last:pb-0">
            <span className="block text-[0.78rem] font-bold text-teal-brand">{sourceLine(change.source)}</span>
            <span className="mt-0.5 block text-[1.05rem] font-extrabold leading-snug tracking-[-0.01em] text-forest"><Reveal on={reveal} index={index}>{plan.changes[change.id].title(numbers)}</Reveal></span>
          </li>
        ))}
      </ol>
    </section>
  );
}

/** Icons for the four app rows, in appIncludes order: photo, meal ideas, coach, pace. */
const APP_ROW_ICONS: IconName[] = ['camera', 'plate', 'chat', 'calendar'];

/**
 * What the subscription adds: the app that does the work, each row under the answer it serves.
 * The plan's numbers and meals are already free on screen 25, so this card says what is paid for.
 */
export function AppIncludesCard({ data, tdee, system, className }: {
  data: OnboardingPayload;
  tdee: TdeeResult | null;
  system: UnitSystem;
  className?: string;
}) {
  const copy = useCopy();
  const locale = useLocale();
  const reduce = useReducedMotion();
  const answers = useQuizStore((state) => state.planAnswers);
  const sourceLine = useChangeSourceLine();
  const paywall = copy.funnel.paywall;
  const timeline = goalTimeline(data);
  const sources = appIncludeSources(data, answers);
  const rows = paywall.appIncludes({
    calories: tdee ? new Intl.NumberFormat(numberLocale(locale)).format(Math.round(tdee.calories)) : null,
    // Vegan only: meal ideas can be asked for vegan, but nothing in the app guarantees allergy-free or halal food.
    diet: (data.dietary_preferences ?? []).filter((key) => key === 'vegan').map((key) => copy.diet.options.find((option) => option.key === key)?.label).filter(Boolean).join(', ') || null,
    goal: timeline ? formatWeight(timeline.targetKg, system, locale) : null,
  });

  return (
    <section className={cn(CARD, className)}>
      <h2 className="text-[1.12rem] font-extrabold tracking-[-0.02em] text-forest [text-wrap:balance]">{paywall.includesTitle}</h2>
      <p className="mt-1 flex items-center gap-1.5 text-[0.8rem] font-semibold text-muted-brand">
        <AppleMark className="h-3.5 w-3.5 text-charcoal" />
        <GooglePlayMark className="h-3.5 w-3.5" />
        {paywall.includesPlatforms}
      </p>
      <motion.ul
        className="mt-3 divide-y divide-border-brand/60"
        initial={reduce ? false : 'hidden'}
        whileInView="show"
        viewport={{ once: true, margin: '0px 0px -10% 0px' }}
        variants={{ show: { transition: { staggerChildren: 0.06 } } }}
      >
        {rows.map((row, index) => {
          const source = sources[index];
          return (
            <motion.li
              key={row.title}
              className="grid grid-cols-[2.25rem_1fr] gap-3 py-3 first:pt-0 last:pb-0"
              variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } } }}
            >
              <span className="grid h-9 w-9 place-items-center rounded-2xl bg-mist text-teal-brand" aria-hidden="true"><Icon name={APP_ROW_ICONS[index] ?? 'plate'} /></span>
              <span>
                {source && <span className="block text-[0.76rem] font-bold text-teal-brand">{sourceLine(source)}</span>}
                <span className={cn('block text-[0.95rem] font-extrabold leading-snug text-forest', source && 'mt-0.5')}>{row.title}</span>
                <span className="mt-0.5 block text-[0.84rem] leading-relaxed text-muted-brand">{row.body}</span>
              </span>
            </motion.li>
          );
        })}
      </motion.ul>
    </section>
  );
}

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
 * Without `targets` the day's total heads the card instead, for a screen that already shows them.
 */
export function PlanDayCard({ data, tdee, className, reveal, targets = true }: {
  data: OnboardingPayload;
  tdee: TdeeResult;
  className?: string;
  /** Unblur the meal names once, as on the screen right after the email. */
  reveal?: boolean;
  /** The daily label, the kcal column header and the Total row (the paywall). */
  targets?: boolean;
}) {
  const copy = useCopy();
  const locale = useLocale();
  const plan = copy.funnel.plan;
  const day = copy.funnel.day;
  const format = new Intl.NumberFormat(numberLocale(locale));
  const meals = sampleDay(tdee.calories, data.dietary_preferences);
  const total = meals.reduce((sum, row) => sum + row.calories, 0);
  // Vegan is the only diet answer the heading names; the others are allergy needs.
  const vegan = (data.dietary_preferences ?? []).includes('vegan');

  return (
    <section className={cn(CARD, className)}>
      {targets ? (
        <>
          <DailyLabel tdee={tdee} size="sm" />
          <div className="mt-1 flex items-baseline justify-between gap-3 border-t-2 border-forest pt-3">
            <h3 className="text-[0.95rem] font-extrabold text-forest">{day.title}</h3>
            <span className="text-[0.72rem] font-bold text-muted-brand">kcal</span>
          </div>
        </>
      ) : (
        <h3 className="text-[1.05rem] font-extrabold tracking-[-0.01em] text-forest">{day.heading(format.format(total), vegan)}</h3>
      )}
      <ul className="mt-2 grid">
        {meals.map((row, index) => (
          <li key={row.meal} className="grid grid-cols-[4rem_1fr_auto] items-baseline gap-x-3 py-1.5">
            <span className="text-[0.76rem] font-semibold text-muted-brand">{plan.meals[row.meal]}</span>
            {/* Block, so a dish that wraps keeps the meal name and kcal on its first line. */}
            <span className="text-[0.92rem] font-extrabold leading-snug text-forest"><Reveal on={reveal} index={index + 3} className="block">{plan.dishes[row.dish]}</Reveal></span>
            <span className="text-right text-[0.9rem] font-extrabold tabular-nums text-slate-brand">{format.format(row.calories)}</span>
          </li>
        ))}
      </ul>
      {targets && (
        <p className="mt-1.5 flex items-baseline justify-between gap-3 border-t-2 border-forest pt-2.5 text-forest">
          <span className="text-[0.9rem] font-extrabold">{day.total}</span>
          <span className="text-[1rem] font-extrabold tabular-nums">{format.format(total)}</span>
        </p>
      )}
    </section>
  );
}
