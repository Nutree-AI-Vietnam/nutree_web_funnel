'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { AnimatePresence, motion } from 'motion/react';
import { useRouter } from 'next/navigation';
import { previewTdee } from '@/lib/api/client';
import { useCopy } from '@/lib/copy/use-copy';
import { isLocalPreviewHost } from '@/lib/local-preview';
import { goToNextQuizStep } from '@/lib/quiz/navigation';
import { formatWeight } from '@/lib/quiz/units';
import { useUnits } from '@/lib/quiz/use-units';
import { useQuizStore } from '@/lib/quiz/store';
import { computeTdeeResult } from '@/lib/tdee/calculator';
import type { TdeeResult } from '@/lib/quiz/types';
import { cn } from '@/lib/utils';

// Deliberately paced so the "building your plan" moment feels substantial.
const TOTAL_MS = 10000;
const RING_R = 52;
const RING_C = 2 * Math.PI * RING_R;


function usePrefersReducedMotion() {
  const [reduce, setReduce] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const on = () => setReduce(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return reduce;
}

export function CalculatingStep() {
  const vi = useCopy();
  const router = useRouter();
  const routerRef = useRef(router);
  routerRef.current = router;
  const { system } = useUnits();
  const data = useQuizStore((s) => s.data);
  const setTdee = useQuizStore((s) => s.setTdee);
  const cooking = useQuizStore((s) => s.planAnswers.cooking);
  const setPlanAnswers = useQuizStore((s) => s.setPlanAnswers);
  const reduce = usePrefersReducedMotion();
  const [elapsed, setElapsed] = useState(0);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [outcome, setOutcome] = useState<{ result: TdeeResult; source: 'api' | 'fallback' } | null | undefined>(undefined);
  const loader = vi.funnel.loader;

  // The visitor's own answers, ticked off one by one instead of a climbing calorie count.
  const items = useMemo(() => {
    const goal = vi.goal.options.find((option) => option.key === data.fitness_goal)?.label;
    const diet = (data.dietary_preferences ?? []).filter((key) => key !== 'none')
      .map((key) => vi.diet.options.find((option) => option.key === key)?.label)
      .filter(Boolean)
      .join(', ');
    const moment = vi.eating_pattern.options.find((option) => option.key === data.hardest_eating_moment)?.label;
    return [
      goal ? loader.goal(goal) : null,
      data.weight_kg != null && data.target_weight_kg != null
        ? loader.weights(formatWeight(data.weight_kg, system), formatWeight(data.target_weight_kg, system))
        : null,
      data.training_days_per_week ? loader.training(data.training_days_per_week) : loader.noTraining,
      diet ? loader.diet(diet) : loader.dietNone,
      moment ? loader.moment(moment) : null,
      loader.calories,
    ].filter((item): item is string => Boolean(item));
  }, [data, loader, system, vi]);
  // One yes/no question halfway through, unless it was answered on an earlier pass.
  const pauseAt = Math.floor(items.length / 2);
  const stageMs = TOTAL_MS / items.length;
  const paused = !reduce && cooking == null && elapsed >= pauseAt * stageMs;

  useEffect(() => {
    let cancelled = false;
    setReady(false);
    setError(false);
    setOutcome(undefined);
    const fallback = () => {
      const result = computeTdeeResult(data);
      return result ? { result, source: 'fallback' as const } : null;
    };
    const fetchTdee = isLocalPreviewHost()
      ? Promise.resolve(fallback())
      : previewTdee(data)
        .then((result) => ({ result, source: 'api' as const }))
        .catch((fetchError: unknown) => {
          // The local copy gives the same numbers, but a failing preview usually
          // means a config problem (API URL, CORS), so leave a trace in the console.
          console.warn('TDEE preview failed; using the local calculation.', fetchError);
          return fallback();
        });
    void fetchTdee.then((result) => {
      if (!cancelled) setOutcome(result);
    });
    return () => {
      cancelled = true;
    };
  }, [attempt, data]);

  // The checklist advances on animation frames and stands still while the question is open.
  useEffect(() => {
    if (reduce) {
      setElapsed(TOTAL_MS);
      return;
    }
    if (paused) return;
    let raf = 0;
    let last = performance.now();
    raf = requestAnimationFrame(function tick(now) {
      const step = now - last;
      last = now;
      setElapsed((value) => Math.min(TOTAL_MS, value + step));
      raf = requestAnimationFrame(tick);
    });
    // rAF pauses in background tabs; a timer keeps the loader from waiting there forever.
    const timer = window.setTimeout(() => setElapsed((value) => Math.max(value, TOTAL_MS)), TOTAL_MS * 1.5);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(timer);
    };
  }, [paused, reduce]);

  const complete = elapsed >= TOTAL_MS;

  useEffect(() => {
    if (!complete || outcome === undefined) return;
    if (!outcome) {
      setError(true);
      return;
    }
    setTdee(outcome.result, outcome.source);
    setReady(true);
    goToNextQuizStep(routerRef.current, 'calculating');
  }, [complete, outcome, setTdee]);

  const testimonials = vi.calculating.testimonials;
  const [testimonialIndex, setTestimonialIndex] = useState(0);
  const frac = Math.min(1, elapsed / TOTAL_MS);
  const stage = Math.min(items.length, Math.floor(elapsed / stageMs));

  useEffect(() => {
    if (reduce || testimonials.length < 2) return;
    const id = window.setInterval(() => {
      setTestimonialIndex((index) => (index + 1) % testimonials.length);
    }, 2600);
    return () => window.clearInterval(id);
  }, [reduce, testimonials.length]);

  const testimonial = testimonials[testimonialIndex] ?? testimonials[0];
  const subtitle = ready ? loader.done : complete ? vi.calculating.preparing : items[Math.min(stage, items.length - 1)];
  const name = data.name?.trim();

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-x-clip overflow-y-auto overscroll-contain">
      <header className="text-center">
        <h1 className="ph-mask mx-auto max-w-[20rem] text-[clamp(1.7rem,6vw,2rem)] font-extrabold leading-[1.12] tracking-tight text-forest [text-wrap:balance]">
          {name ? loader.title(name) : loader.titleFallback}
        </h1>
        <p className="mx-auto mt-2 max-w-[22rem] text-base font-semibold leading-snug text-slate-brand">{loader.body}</p>
        {/* The checklist below shows the step in progress, so the visible line waits for the finished plan; the space stays reserved. */}
        <div className="mt-2 min-h-7">
          {ready && (
            <p className="mx-auto inline-flex min-h-7 items-center gap-1.5 rounded-full bg-teal-brand/12 px-3 text-xs font-bold text-teal-brand" aria-hidden="true">
              <span>✓</span>
              {subtitle}
            </p>
          )}
          <span className="sr-only" aria-live="polite">{subtitle}</span>
        </div>
      </header>

      {/* No min-h-0: on short screens this block must keep its height and scroll, not center up into the header. */}
      <div className="flex flex-1 flex-col justify-center gap-3 py-1">
        {/* Hero ring: counts up to the user's real target */}
        <div className="flex flex-col items-center">
          <div className="relative grid h-[clamp(8.5rem,21vh,11rem)] w-[clamp(8.5rem,21vh,11rem)] place-items-center">
            <div
              className={cn('absolute inset-4 rounded-full bg-teal-brand/14 blur-2xl', !complete && 'motion-safe:animate-pulse')}
              aria-hidden="true"
            />
            <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90" aria-hidden="true">
              <defs>
                <linearGradient id="calcRing" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#17453a" />
                  <stop offset="1" stopColor="#34d0b4" />
                </linearGradient>
              </defs>
              <circle cx="60" cy="60" r={RING_R} fill="none" strokeWidth="8" stroke="currentColor" className="text-forest/8" />
              <circle
                cx="60"
                cy="60"
                r={RING_R}
                fill="none"
                stroke="url(#calcRing)"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={RING_C}
                strokeDashoffset={RING_C * (1 - frac)}
              />
            </svg>
            <div className="absolute inset-0 grid place-items-center text-center">
              <div className="text-[clamp(1.9rem,5.2vh,2.6rem)] font-extrabold leading-none tabular-nums text-forest">
                {Math.round(frac * 100)}%
              </div>
            </div>
          </div>

          {/* The visitor's answers, ticked off as the plan is built. */}
          <ol className="mt-4 grid w-full max-w-[20rem] gap-2">
            {items.map((item, index) => {
              const done = complete || index < stage;
              const active = index === stage && !complete;
              return (
                <li key={item} className={cn('flex items-center gap-2.5 text-sm font-bold transition-colors duration-300', done ? 'text-forest' : active ? 'text-slate-brand' : 'text-muted-brand/60')}>
                  <span
                    aria-hidden="true"
                    className={cn(
                      'grid h-5 w-5 shrink-0 place-items-center rounded-full text-[0.65rem] font-black',
                      done ? 'bg-teal-brand text-white' : active ? 'border-2 border-teal-brand/40 border-t-teal-brand motion-safe:animate-spin' : 'border-2 border-forest/12',
                    )}
                  >
                    {done ? '✓' : ''}
                  </span>
                  <span className="ph-mask min-w-0">{item}</span>
                </li>
              );
            })}
          </ol>
        </div>

        {testimonial && (
          <div>
            <AnimatePresence mode="wait">
              <motion.figure
                key={testimonial.name}
                initial={reduce ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduce ? undefined : { opacity: 0, y: -10 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                aria-label={vi.calculating.testimonialsLabel}
                className="rounded-[1.4rem] bg-white/85 px-4 py-3.5 shadow-[0_14px_40px_rgb(26_71_57_/_0.08),inset_0_1px_0_rgb(255_255_255_/_0.8)]"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <Image src={testimonial.avatar} alt="" width={40} height={40} className="h-10 w-10 rounded-full object-cover" />
                    <div>
                      <figcaption className="text-sm font-extrabold text-forest">
                        {testimonial.name} <span aria-hidden="true">{testimonial.flag}</span>
                      </figcaption>
                      <p className="text-[0.68rem] font-bold text-muted-brand">{testimonial.goal}</p>
                    </div>
                  </div>
                  <span className="shrink-0 rounded-full bg-teal-brand/12 px-2.5 py-1 text-[0.68rem] font-extrabold text-teal-brand">{testimonial.result}</span>
                </div>
                <div className="mt-2.5 flex gap-0.5 text-[#e7a23a]" aria-label="5">
                  {Array.from({ length: 5 }, (_, index) => (
                    <span key={index} aria-hidden="true">★</span>
                  ))}
                </div>
                <blockquote className="mt-1.5 min-h-[3.6rem] text-sm font-semibold leading-relaxed text-slate-brand">“{testimonial.quote}”</blockquote>
              </motion.figure>
            </AnimatePresence>
            <div className="mt-2.5 flex justify-center gap-1.5" aria-hidden="true">
              {testimonials.map((item, index) => (
                <span key={item.name} className={cn('h-1.5 rounded-full transition-all duration-300', index === testimonialIndex ? 'w-5 bg-teal-brand' : 'w-1.5 bg-forest/15')} />
              ))}
            </div>
          </div>
        )}
      </div>

      {paused && (
        <div className="fixed inset-0 z-50 grid place-items-end bg-slate-950/30 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-[2px] sm:place-items-center" role="presentation">
          <section role="dialog" aria-modal="true" aria-labelledby="loader-question" className="w-full max-w-md rounded-[1.8rem] bg-white p-5 shadow-[0_28px_80px_rgb(10_18_16_/_0.28)] animate-soft-enter">
            <p id="loader-question" className="text-lg font-extrabold leading-snug text-forest">{loader.pauseQuestion}</p>
            <div className="mt-4 grid grid-cols-2 gap-2.5">
              <button type="button" autoFocus onClick={() => setPlanAnswers({ cooking: 'home' })} className="min-h-13 rounded-2xl bg-forest px-3 py-3 text-sm font-extrabold text-white focus:outline-none focus-visible:ring-4 focus-visible:ring-teal-brand/30">{loader.yes}</button>
              <button type="button" onClick={() => setPlanAnswers({ cooking: 'out' })} className="min-h-13 rounded-2xl border border-border-brand bg-white px-3 py-3 text-sm font-extrabold text-forest focus:outline-none focus-visible:ring-4 focus-visible:ring-teal-brand/30">{loader.no}</button>
            </div>
          </section>
        </div>
      )}

      {error && (
        <div className="mt-auto pt-2">
          <button
            type="button"
            onClick={() => setAttempt((value) => value + 1)}
            className="min-h-12 w-full rounded-2xl border border-border-brand bg-white px-4 text-sm font-extrabold text-forest transition hover:bg-mist focus:outline-none focus-visible:ring-4 focus-visible:ring-teal-brand/20 active:scale-[0.98]"
          >
            {vi.common.retry}
          </button>
        </div>
      )}
    </div>
  );
}
