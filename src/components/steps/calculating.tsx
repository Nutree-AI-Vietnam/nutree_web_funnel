'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PrimaryButton } from '@/components/primary-button';
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
  const slides = vi.calculating.slides ?? [];
  const stageMs = TOTAL_MS / steps.length;
  const rawT = elapsed / TOTAL_MS;
  // Under reduced motion, snap straight to the resolved state (no count-up / fill motion).
  const frac = reduce ? 1 : easeOut(Math.min(1, rawT));
  const stage = reduce ? steps.length : Math.min(steps.length - 1, Math.floor(elapsed / stageMs));
  const stageFrac = reduce ? 1 : Math.min(1, (elapsed - stage * stageMs) / stageMs);
  const complete = rawT >= 1 || reduce;
  const slideIndex = slides.length > 0
    ? reduce
      ? slides.length - 1
      : Math.min(slides.length - 1, Math.floor(elapsed / (TOTAL_MS / slides.length)))
    : 0;
  const slide = slides[slideIndex] ?? { title: '', body: '' };

  // Keep the animated preview aligned with the backend response whenever it
  // succeeds. The local calculation is only a fallback while that response
  // is still pending or unavailable.
  const displayPreview = resolvedPreview ?? preview;
  const calories = displayPreview ? Math.round((displayPreview.calories * frac) / 5) * 5 : null;
  const calorieLocale = locale === 'vi' ? 'vi-VN' : 'en-US';

  const macroTotal = displayPreview ? displayPreview.protein_g + displayPreview.carbs_g + displayPreview.fat_g : 1;
  const macros = displayPreview
    ? [
        { label: vi.tdee_targets.protein, grams: displayPreview.protein_g, color: 'bg-protein' },
        { label: vi.tdee_targets.carbs, grams: displayPreview.carbs_g, color: 'bg-carbs' },
        { label: vi.tdee_targets.fat, grams: displayPreview.fat_g, color: 'bg-fat' },
      ]
    : [];

  const subtitle = ready
    ? vi.calculating.ready
    : complete
      ? vi.calculating.preparing
      : steps[Math.min(stage, steps.length - 1)];

  return (
    <div className="flex flex-1 flex-col">
      <header className="text-center">
        <h1 className="mx-auto max-w-[20rem] text-[1.6rem] font-extrabold leading-[1.12] tracking-tight text-forest [text-wrap:balance]">
          {vi.calculating.text.replace('[name]', data.name || vi.reflection.fallbackName)}
        </h1>
        <p
          className={cn(
            'mx-auto mt-2 inline-flex min-h-7 items-center gap-1.5 rounded-full px-3 text-xs font-bold transition-colors duration-500',
            ready ? 'bg-teal-brand/12 text-teal-brand' : 'text-muted-brand',
          )}
          aria-live="polite"
        >
          {ready && <span aria-hidden="true">✓</span>}
          {subtitle}
        </p>
      </header>

      <div className="flex min-h-0 flex-1 flex-col justify-center gap-3 py-1">
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
                  <div className="mt-1.5 text-[0.62rem] font-extrabold uppercase tracking-[0.14em] text-muted-brand">
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

          {/* Four-stage progress track */}
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
          <p className="mt-2 text-[0.68rem] font-bold uppercase tracking-[0.14em] text-muted-brand">
            {Math.min(stage + 1, steps.length)}/{steps.length} · {steps[Math.min(stage, steps.length - 1)]}
          </p>
        </div>

        {/* Macro split grows toward the real allocation */}
        {displayPreview && (
          <section
            aria-label={vi.calculating.macroCaption}
            className="rounded-[1.4rem] bg-white/80 p-3.5 shadow-[0_14px_40px_rgb(26_71_57_/_0.08),inset_0_1px_0_rgb(255_255_255_/_0.8)] backdrop-blur"
          >
            <p className="text-[0.68rem] font-extrabold uppercase tracking-[0.14em] text-muted-brand">
              {vi.calculating.macroCaption}
            </p>
            <div className="mt-2.5 flex h-2.5 gap-0.5 overflow-hidden rounded-full bg-forest/6">
              {macros.map((m) => (
                <span
                  key={m.label}
                  className={cn('h-full rounded-full transition-[width] duration-150 ease-linear', m.color)}
                  style={{ width: `${(m.grams / macroTotal) * 100 * frac}%` }}
                />
              ))}
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {macros.map((m) => (
                <div key={m.label}>
                  <div className="flex items-center gap-1.5">
                    <span className={cn('h-2 w-2 shrink-0 rounded-full', m.color)} aria-hidden="true" />
                    <span className="truncate text-[0.68rem] font-bold text-muted-brand">{m.label}</span>
                  </div>
                  <div className="mt-0.5 text-lg font-extrabold leading-none tabular-nums text-forest">
                    {Math.round(m.grams * frac)}g
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Rotating reassurance while the user waits */}
        <div key={slideIndex} className="animate-soft-enter min-h-[3.25rem] text-center" aria-live="polite">
          <p className="text-sm font-extrabold text-forest">{slide.title}</p>
          <p className="mx-auto mt-1 max-w-[19rem] text-xs font-semibold leading-relaxed text-muted-brand">{slide.body}</p>
        </div>
      </div>

      {/* Wait for user confirmation instead of auto-advancing */}
      <div className="mt-auto pt-2">
        {ready ? (
          <PrimaryButton onClick={() => goToNextQuizStep(router, 'calculating')}>
            {vi.calculating.cta}
          </PrimaryButton>
        ) : error ? (
          <button
            type="button"
            onClick={() => setAttempt((value) => value + 1)}
            className="min-h-12 w-full rounded-2xl border border-border-brand bg-white px-4 text-sm font-extrabold text-forest transition hover:bg-mist focus:outline-none focus-visible:ring-4 focus-visible:ring-teal-brand/20 active:scale-[0.98]"
          >
            {vi.common.retry}
          </button>
        ) : (
          <div className="min-h-12" />
        )}
      </div>
    </div>
  );
}
