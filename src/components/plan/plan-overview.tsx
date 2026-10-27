'use client';

import { motion, useReducedMotion } from 'motion/react';
import type { ReactNode } from 'react';
import { CountUp } from '@/components/ui/count-up';
import { Icon, type IconName } from '@/components/ui/icons';
import { AppleMark, GooglePlayMark } from '@/components/value-tour/value-tour-demos';
import { useCopy, useLocale } from '@/lib/copy/use-copy';
import { appIncludeSources, firstChangePlan, planNumbers, sampleDay, type ChangeSource } from '@/lib/quiz/plan-content';
import { firstWin, formatGoalDate, goalTimeline, type GoalTimeline } from '@/lib/quiz/progress-projection';
import { useQuizStore } from '@/lib/quiz/store';
import type { OnboardingPayload, TdeeResult } from '@/lib/quiz/types';
import { formatWeight, type UnitSystem } from '@/lib/quiz/units';
import { cn } from '@/lib/utils';

/** The plain white plan card; reflection (07) reuses it so its rows read as part of the same plan. */
export const CARD = 'rounded-[1.6rem] bg-white p-4 shadow-[0_6px_16px_rgb(23_69_58_/_0.07)] sm:p-5';

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

/** Rough width of a short SVG label, for placing the goal callout without measuring the DOM. */
function labelWidth(text: string, px: number) {
  return text.length * px * 0.58;
}

/**
 * The forecast in three stages: two waypoints on the way (e.g. month 2 and month 4), then the goal in a callout.
 * Each waypoint's weight is read off the drawn curve, so the dots, their labels and the line always agree.
 */
export function GoalChart({ timeline, system, nowLabel, stageLabel, goalLabel, goalCaption, animate = false }: {
  timeline: GoalTimeline;
  system: UnitSystem;
  nowLabel: string;
  /** Names a waypoint under the axis, e.g. "Month 2". */
  stageLabel: (unit: 'week' | 'month', n: number) => string;
  /** Under the goal end of the path, usually its date. */
  goalLabel?: string;
  /** Under the goal date, e.g. "Goal". */
  goalCaption?: string;
  /** Draw the path in once, then land the goal callout (the progress screen only). */
  animate?: boolean;
}) {
  const locale = useLocale();
  const reduce = useReducedMotion();
  const play = animate && !reduce;
  const left = 22;
  const right = 300;
  const top = 50;
  const bottom = 156;
  const axis = 176;
  const x = (day: number) => left + ((right - left) * Math.min(Math.max(day, 0), timeline.days)) / timeline.days;
  const y = (kg: number) => {
    const span = timeline.targetKg - timeline.currentKg;
    const share = span === 0 ? 0 : (kg - timeline.currentKg) / span;
    return timeline.reducing ? top + (bottom - top) * share : bottom - (bottom - top) * share;
  };
  const start = { x: x(0), y: y(timeline.currentKg) };
  const end = { x: x(timeline.days), y: y(timeline.targetKg) };
  // A gentle ease into the goal: close to the stated weekly pace, so the waypoint weights read true.
  const c1 = { x: start.x + (end.x - start.x) * 0.33, y: start.y + (end.y - start.y) * 0.42 };
  const c2 = { x: start.x + (end.x - start.x) * 0.67, y: start.y + (end.y - start.y) * 0.9 };
  const curve = `M${start.x} ${start.y} C${c1.x} ${c1.y} ${c2.x} ${c2.y} ${end.x} ${end.y}`;
  const bezier = (t: number, a: number, b: number, c: number, d: number) => (1 - t) ** 3 * a + 3 * (1 - t) ** 2 * t * b + 3 * (1 - t) * t ** 2 * c + t ** 3 * d;
  const curveY = (px: number) => {
    let lo = 0;
    let hi = 1;
    for (let i = 0; i < 24; i += 1) {
      const mid = (lo + hi) / 2;
      if (bezier(mid, start.x, c1.x, c2.x, end.x) < px) lo = mid;
      else hi = mid;
    }
    return bezier(lo, start.y, c1.y, c2.y, end.y);
  };
  const kgAt = (py: number) => {
    const share = timeline.reducing ? (py - top) / (bottom - top) : (bottom - py) / (bottom - top);
    return Math.round((timeline.currentKg + share * (timeline.targetKg - timeline.currentKg)) * 2) / 2;
  };
  // Two waypoints at about a third and two thirds of the way, in whole months (whole weeks for short goals).
  // Each gets a column on the axis row (weight over "Month N"); a column that would touch its neighbour is dropped.
  const unit: 'week' | 'month' = timeline.days >= 90 ? 'month' : 'week';
  const unitDays = unit === 'month' ? 30.44 : 7;
  const totalUnits = timeline.days / unitDays;
  const columnHalf = (weight: string, caption: string) => Math.max(labelWidth(weight, 12.5), labelWidth(caption, 10.5)) * 0.45;
  const startEdge = start.x - 2 + columnHalf(formatWeight(timeline.currentKg, system, locale), nowLabel) * 2;
  const endEdge = end.x + 2 - columnHalf(goalLabel ?? '', goalCaption ?? '') * 2;
  const stages: { n: number; x: number; y: number; kg: number }[] = [];
  if (timeline.days >= 21) {
    for (const n of new Set([Math.max(1, Math.round(totalUnits / 3)), Math.round((totalUnits * 2) / 3)])) {
      if (n < 1 || n >= totalUnits) continue;
      const sx = x(n * unitDays);
      const sy = curveY(sx);
      const kg = kgAt(sy);
      const half = columnHalf(formatWeight(kg, system, locale), stageLabel(unit, n));
      const previousEdge = stages.length ? stages[stages.length - 1].x + half + 6 : startEdge + 6;
      if (sx - half > previousEdge && sx + half < endEdge - 6) stages.push({ n, x: sx, y: sy, kg });
    }
  }

  const goalText = formatWeight(timeline.targetKg, system, locale);
  const bubbleW = Math.round(labelWidth(goalText, 13) + 22);
  const bubbleH = 26;
  const bubbleX = Math.min(Math.max(end.x - bubbleW / 2, 2), 324 - bubbleW);
  const bubbleY = end.y - bubbleH - 15;
  const pointerX = Math.min(Math.max(end.x, bubbleX + 10), bubbleX + bubbleW - 10);
  const draw = { duration: 1, ease: [0.22, 1, 0.36, 1] as const, delay: 0.15 };

  return (
    <svg viewBox="0 0 326 214" className="mt-1 h-auto w-full overflow-visible" role="img" aria-label={`${formatWeight(timeline.currentKg, system, locale)} → ${goalText}`}>
      <defs>
        <linearGradient id="plan-fill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#1fa892" stopOpacity="0.26" />
          <stop offset="0.7" stopColor="#1fa892" stopOpacity="0.06" />
          <stop offset="1" stopColor="#1fa892" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="plan-line" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#7fd6c4" />
          <stop offset="0.55" stopColor="#1fa892" />
          <stop offset="1" stopColor="#17453a" />
        </linearGradient>
        <filter id="plan-glow" x="-10%" y="-40%" width="120%" height="180%">
          <feGaussianBlur stdDeviation="5" />
        </filter>
      </defs>
      {/* The goal level, so the eye reads how far the line still has to travel. */}
      <path d={`M${left} ${end.y}H${end.x}`} stroke="#1fa892" strokeOpacity="0.35" strokeWidth="1.2" strokeDasharray="2 5" strokeLinecap="round" />
      <path d={`M${left} ${axis}H${right}`} stroke="#d5e1dc" strokeWidth="1.2" />
      <motion.path
        d={`${curve} L${end.x} ${axis} L${start.x} ${axis} Z`}
        fill="url(#plan-fill)"
        initial={play ? { opacity: 0 } : false}
        animate={play ? { opacity: 1 } : undefined}
        transition={{ duration: 0.6, delay: 0.55 }}
      />
      <path d={`M${end.x} ${end.y + 8}V${axis}`} stroke="#17453a" strokeOpacity="0.28" strokeWidth="1.2" strokeDasharray="2 4" strokeLinecap="round" />
      {/* A soft glow under the line gives it depth without a shadow box. */}
      <motion.path
        d={curve}
        fill="none"
        stroke="#1fa892"
        strokeOpacity="0.35"
        strokeWidth="10"
        strokeLinecap="round"
        filter="url(#plan-glow)"
        initial={play ? { pathLength: 0 } : false}
        animate={play ? { pathLength: 1 } : undefined}
        transition={draw}
      />
      <motion.path
        d={curve}
        fill="none"
        stroke="url(#plan-line)"
        strokeWidth="5.5"
        strokeLinecap="round"
        initial={play ? { pathLength: 0 } : false}
        animate={play ? { pathLength: 1 } : undefined}
        transition={draw}
      />
      <circle cx={start.x} cy={start.y} r="6.5" fill="white" stroke="#7fbfb0" strokeWidth="3" />
      {stages.map((stage, index) => (
        <motion.g
          key={stage.n}
          initial={play ? { opacity: 0, scale: 0.6 } : false}
          animate={play ? { opacity: 1, scale: 1 } : undefined}
          transition={{ delay: 0.45 + index * 0.25, duration: 0.3 }}
          style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
        >
          <path d={`M${stage.x} ${stage.y + 7}V${axis}`} stroke="#1fa892" strokeOpacity="0.3" strokeWidth="1.2" strokeDasharray="2 4" strokeLinecap="round" />
          <circle cx={stage.x} cy={stage.y} r="5.5" fill="#1fa892" stroke="white" strokeWidth="2.5" />
        </motion.g>
      ))}
      {play && (
        // One pulse once the goal dot has landed.
        <motion.circle
          cx={end.x}
          cy={end.y}
          r="8"
          fill="none"
          stroke="#1fa892"
          strokeWidth="2"
          initial={{ scale: 1, opacity: 0 }}
          animate={{ scale: 2.4, opacity: [0, 0.4, 0] }}
          transition={{ duration: 0.9, delay: 1.2, opacity: { duration: 0.9, delay: 1.2, times: [0, 0.01, 1] } }}
          style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
        />
      )}
      <motion.g
        initial={play ? { opacity: 0, y: 6 } : false}
        animate={play ? { opacity: 1, y: 0 } : undefined}
        transition={{ delay: 1, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      >
        <circle cx={end.x} cy={end.y} r="13" fill="#1fa892" fillOpacity="0.16" />
        <circle cx={end.x} cy={end.y} r="7.5" fill="#17453a" stroke="white" strokeWidth="3" />
        <rect x={bubbleX} y={bubbleY} width={bubbleW} height={bubbleH} rx="13" fill="#17453a" />
        <path d={`M${pointerX - 6} ${bubbleY + bubbleH - 0.5} L${pointerX} ${bubbleY + bubbleH + 6} L${pointerX + 6} ${bubbleY + bubbleH - 0.5} Z`} fill="#17453a" />
        <text x={bubbleX + bubbleW / 2} y={bubbleY + 17.5} textAnchor="middle" className="fill-white text-[13px] font-extrabold tabular-nums">{goalText}</text>
      </motion.g>
      <text x={start.x - 2} y="196" textAnchor="start" className="fill-forest text-[12.5px] font-extrabold tabular-nums">{formatWeight(timeline.currentKg, system, locale)}</text>
      <text x={start.x - 2} y="211" textAnchor="start" className="fill-muted-brand text-[10.5px] font-bold">{nowLabel}</text>
      {stages.map((stage) => (
        <g key={stage.n}>
          <text x={stage.x} y="196" textAnchor="middle" className="fill-forest text-[12.5px] font-extrabold tabular-nums">{formatWeight(stage.kg, system, locale)}</text>
          <text x={stage.x} y="211" textAnchor="middle" className="fill-muted-brand text-[10.5px] font-bold">{stageLabel(unit, stage.n)}</text>
        </g>
      ))}
      {goalLabel && <text x={end.x + 2} y="196" textAnchor="end" className="fill-forest text-[12.5px] font-extrabold">{goalLabel}</text>}
      {goalCaption && <text x={end.x + 2} y="211" textAnchor="end" className="fill-muted-brand text-[10.5px] font-bold">{goalCaption}</text>}
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
  const win = firstWin(timeline, system, locale);
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
        <span className="rounded-full bg-white/12 px-2.5 py-1 text-[0.8rem] font-bold">{plan.firstWin(formatWeight(win.kg, system, locale), formatGoalDate(win.date, locale, false))}</span>
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
  const timeline = goalTimeline(data);
  const win = timeline ? firstWin(timeline, system, locale) : null;
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
          {win && <p className="mt-1 text-sm font-bold text-slate-brand">{plan.firstWin(formatWeight(win.kg, system, locale), formatGoalDate(win.date, locale, false))}</p>}
          <GoalChart timeline={timeline} system={system} nowLabel={plan.now} stageLabel={copy.funnel.progress.stage} goalLabel={formatGoalDate(timeline.date, locale, false)} goalCaption={copy.funnel.progress.goal} />
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
  const meals = sampleDay(tdee.calories, data.dietary_preferences, tdee.protein_g);
  const total = meals.reduce((sum, row) => sum + row.calories, 0);
  const totalProtein = meals.reduce((sum, row) => sum + row.proteinG, 0);
  // Vegan is the only diet answer the heading names; the others are allergy needs.
  const vegan = (data.dietary_preferences ?? []).includes('vegan');

  return (
    <section className={cn(CARD, className)}>
      {targets ? (
        <>
          <DailyLabel tdee={tdee} size="sm" />
          <div className="mt-1 flex items-baseline justify-between gap-3 border-t-2 border-forest pt-3">
            <h3 className="text-[0.95rem] font-extrabold text-forest">{day.title}</h3>
            <span className="grid grid-cols-[3rem_2.75rem] gap-x-2 text-right text-[0.72rem] font-bold text-muted-brand"><span>{day.protein}</span><span>kcal</span></span>
          </div>
        </>
      ) : (
        <h3 className="text-[1.05rem] font-extrabold tracking-[-0.01em] text-forest">{day.heading(format.format(total), vegan)}</h3>
      )}
      <ul className="mt-2 grid">
        {meals.map((row, index) => (
          <li key={row.meal} className="grid grid-cols-[3.6rem_1fr_3rem_2.75rem] items-baseline gap-x-2 py-1.5">
            <span className="text-[0.76rem] font-semibold text-muted-brand">{plan.meals[row.meal]}</span>
            {/* Block, so a dish that wraps keeps the meal name and kcal on its first line. */}
            <span className="text-[0.92rem] font-extrabold leading-snug text-forest"><Reveal on={reveal} index={index + 3} className="block">{plan.dishes[row.dish]}</Reveal></span>
            <span className="whitespace-nowrap text-right text-[0.84rem] font-bold tabular-nums text-protein">{row.proteinG} g</span>
            <span className="text-right text-[0.9rem] font-extrabold tabular-nums text-slate-brand">{format.format(row.calories)}</span>
          </li>
        ))}
      </ul>
      {targets && (
        <p className="mt-1.5 flex items-baseline justify-between gap-3 border-t-2 border-forest pt-2.5 text-forest">
          <span className="text-[0.9rem] font-extrabold">{day.total}</span>
          <span className="grid grid-cols-[3rem_2.75rem] gap-x-2 text-right tabular-nums"><span className="whitespace-nowrap text-[0.92rem] font-extrabold text-protein">{totalProtein} g</span><span className="text-[1rem] font-extrabold">{format.format(total)}</span></span>
        </p>
      )}
    </section>
  );
}
