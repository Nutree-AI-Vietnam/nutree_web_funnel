'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { AnimatePresence, motion } from 'motion/react';
import { useRouter } from 'next/navigation';
import { previewTdee } from '@/lib/api/client';
import { useCopy, useLocale } from '@/lib/copy/use-copy';
import { isLocalPreviewHost } from '@/lib/local-preview';
import { goToNextQuizStep } from '@/lib/quiz/navigation';
import { useQuizStore } from '@/lib/quiz/store';
import { computeTdeeResult } from '@/lib/tdee/calculator';
import type { TdeeResult } from '@/lib/quiz/types';
import { cn } from '@/lib/utils';

// Deliberately paced so the "building your plan" moment feels substantial.
const TOTAL_MS = 10000;
const RING_R = 52;
const RING_C = 2 * Math.PI * RING_R;

// easeOutCubic: fast reveal that decelerates onto the final number.
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

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
  const locale = useLocale();
  const router = useRouter();
  const routerRef = useRef(router);
  routerRef.current = router;
  const data = useQuizStore((s) => s.data);
  const setTdee = useQuizStore((s) => s.setTdee);
  const reduce = usePrefersReducedMotion();
  const [elapsed, setElapsed] = useState(0);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [resolvedPreview, setResolvedPreview] = useState<TdeeResult | null>(null);

  // Compute the user's real numbers locally so the animation counts up to
  // *their* target, not a placeholder. (API result still drives navigation.)
  const preview = useMemo(() => computeTdeeResult(data), [data]);

  useEffect(() => {
    let cancelled = false;
    let raf: number | null = null;
    let delayTimer: number | null = null;
    const duration = reduce ? 0 : TOTAL_MS;
    setElapsed(duration === 0 ? TOTAL_MS : 0);
    setReady(false);
    setError(false);
    setResolvedPreview(null);

    const finishDelay = new Promise<void>((resolve) => {
      delayTimer = window.setTimeout(resolve, duration);
    });
    const start = performance.now();
    if (duration > 0) {
      raf = requestAnimationFrame(function tick(now) {
        if (cancelled) return;
        const e = Math.min(now - start, TOTAL_MS);
        setElapsed(e);
        if (e < TOTAL_MS) raf = requestAnimationFrame(tick);
      });
    }

    const fallback = () => {
      const result = computeTdeeResult(data);
      return result ? { result, source: 'fallback' as const } : null;
    };
    const fetchTdee = isLocalPreviewHost()
      ? Promise.resolve(fallback())
      : previewTdee(data)
        .then((result) => ({ result, source: 'api' as const }))
        .catch((error: unknown) => {
          // The local copy gives the same numbers, but a failing preview usually
          // means a config problem (API URL, CORS), so leave a trace in the console.
          console.warn('TDEE preview failed; using the local calculation.', error);
          return fallback();
        });

    Promise.all([fetchTdee, finishDelay]).then(([outcome]) => {
      if (cancelled) return;
      if (raf != null) cancelAnimationFrame(raf);
      // rAF pauses in background tabs while the timer keeps running, so land
      // the count-up and checklist on their final state explicitly.
      setElapsed(TOTAL_MS);
      if (outcome) {
        setResolvedPreview(outcome.result);
        setTdee(outcome.result, outcome.source);
        setReady(true);
        goToNextQuizStep(routerRef.current, 'calculating');
      } else {
        setError(true);
      }
    });

    return () => {
      cancelled = true;
      if (raf != null) cancelAnimationFrame(raf);
      if (delayTimer != null) window.clearTimeout(delayTimer);
    };
  }, [attempt, data, reduce, setTdee]);

  const steps = vi.calculating.steps;
  const testimonials = vi.calculating.testimonials;
  const [testimonialIndex, setTestimonialIndex] = useState(0);
  const stageMs = TOTAL_MS / steps.length;
  const rawT = elapsed / TOTAL_MS;
  // Under reduced motion, snap straight to the resolved state (no count-up / fill motion).
  const frac = reduce ? 1 : easeOut(Math.min(1, rawT));
  const stage = reduce ? steps.length : Math.min(steps.length - 1, Math.floor(elapsed / stageMs));
  const stageFrac = reduce ? 1 : Math.min(1, (elapsed - stage * stageMs) / stageMs);
  const complete = rawT >= 1 || reduce;

  useEffect(() => {
    if (reduce || testimonials.length < 2) return;
    const id = window.setInterval(() => {
      setTestimonialIndex((index) => (index + 1) % testimonials.length);
    }, 2600);
    return () => window.clearInterval(id);
  }, [reduce, testimonials.length]);

  const testimonial = testimonials[testimonialIndex] ?? testimonials[0];

  // Keep the animated preview aligned with the backend response whenever it
  // succeeds. The local calculation is only a fallback while that response
  // is still pending or unavailable.
  const displayPreview = resolvedPreview ?? preview;
  // Steps of 5 keep the count-up readable; the final value must match the plan screen exactly.
  const calories = displayPreview
    ? frac >= 1
      ? Math.round(displayPreview.calories)
      : Math.round((displayPreview.calories * frac) / 5) * 5
    : null;
  const calorieLocale = locale === 'vi' ? 'vi-VN' : 'en-US';

  const subtitle = ready
    ? vi.calculating.ready
    : complete
      ? vi.calculating.preparing
      : steps[Math.min(stage, steps.length - 1)];

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-x-clip overflow-y-auto overscroll-contain">
      <header className="text-center">
        <h1 className="ph-mask mx-auto max-w-[20rem] text-[clamp(1.7rem,6vw,2rem)] font-extrabold leading-[1.12] tracking-tight text-forest [text-wrap:balance]">
          {vi.calculating.text.replace('[name]', data.name || vi.reflection.fallbackName)}
        </h1>
        <p className="mx-auto mt-2 max-w-[22rem] text-base font-semibold leading-snug text-slate-brand">{vi.calculating.description}</p>
        <p
          className={cn(
            'mx-auto mt-2 inline-flex min-h-7 items-center gap-1.5 rounded-full px-3 text-xs font-bold transition-colors duration-500',
            ready ? 'bg-teal-brand/12 text-teal-brand' : 'text-muted-brand',
          )}
          aria-live="polite"
        >
          {ready ? (
            <span aria-hidden="true">✓</span>
          ) : (
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-teal-brand/25 border-t-teal-brand" aria-hidden="true" />
          )}
          {subtitle}
        </p>
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
              {calories != null ? (
                <div>
                  <div className="text-[clamp(1.9rem,5.2vh,2.6rem)] font-extrabold leading-none tracking-tight tabular-nums text-forest">
                    {calories.toLocaleString(calorieLocale)}
                  </div>
                  <div className="mt-1.5 text-[0.62rem] font-extrabold tracking-[0.02em] text-muted-brand">
                    {vi.calculating.unit}
                  </div>
                </div>
              ) : (
                <div className="text-[clamp(1.9rem,5.2vh,2.6rem)] font-extrabold leading-none tabular-nums text-forest">
                  {Math.round(frac * 100)}%
                </div>
              )}
            </div>
          </div>

          {/* One bar per plan-building stage */}
          <ol className="mt-3 flex w-full max-w-[16rem] gap-1.5" aria-label={steps.join(', ')}>
            {steps.map((item, index) => {
              const done = complete || index < stage;
              const active = index === stage && !complete;
              const fill = done ? 100 : active ? Math.round(stageFrac * 100) : 0;
              return (
                <li key={item} className="h-1.5 flex-1 overflow-hidden rounded-full bg-forest/8" aria-current={active || undefined}>
                  <div
                    className="h-full rounded-full bg-[linear-gradient(90deg,#1fa892,#34d0b4)] transition-[width] duration-150 ease-linear"
                    style={{ width: `${fill}%` }}
                  />
                </li>
              );
            })}
          </ol>
          <p className="mt-2 text-[0.68rem] font-bold tracking-[0.02em] text-muted-brand">
            {Math.min(stage + 1, steps.length)}/{steps.length} · {steps[Math.min(stage, steps.length - 1)]}
          </p>
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
