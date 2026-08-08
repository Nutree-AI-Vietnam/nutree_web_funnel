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
        .catch(fallback);

    Promise.all([fetchTdee, finishDelay]).then(([outcome]) => {
      if (cancelled) return;
      if (raf != null) cancelAnimationFrame(raf);
      if (outcome) {
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

  const calories = preview ? Math.round((preview.calories * frac) / 5) * 5 : null;
  const calorieLocale = locale === 'vi' ? 'vi-VN' : 'en-US';

  const macroMax = preview ? Math.max(preview.protein_g, preview.carbs_g, preview.fat_g) : 1;
  const macros = preview
    ? [
        { label: vi.tdee_targets.protein, grams: preview.protein_g, color: 'bg-protein' },
        { label: vi.tdee_targets.carbs, grams: preview.carbs_g, color: 'bg-carbs' },
        { label: vi.tdee_targets.fat, grams: preview.fat_g, color: 'bg-fat' },
      ]
    : [];

  const subtitle = ready
    ? vi.calculating.ready
    : complete
      ? vi.calculating.preparing
      : steps[Math.min(stage, steps.length - 1)];

  return (
    <div className="flex flex-1 flex-col">
      <header>
        <h1 className="max-w-[20rem] text-[1.9rem] font-extrabold leading-[1.12] tracking-tight text-forest [text-wrap:balance]">
          {vi.calculating.text.replace('[name]', data.name || vi.reflection.fallbackName)}
        </h1>
        <p className="mt-2.5 min-h-6 text-sm font-semibold leading-relaxed text-muted-brand" aria-live="polite">
          {subtitle}
        </p>
      </header>

      <div className="flex min-h-0 flex-1 flex-col justify-start gap-3 pt-3">
        <div key={slideIndex} className="animate-soft-enter rounded-[1.5rem] border border-teal-brand/15 bg-white/72 px-3 py-2.5 text-center shadow-[inset_0_1px_0_rgb(255_255_255_/_0.8)]" aria-live="polite">
          <p className="text-sm font-extrabold text-forest">{slide.title}</p>
          <p className="mt-1 text-xs font-semibold leading-relaxed text-muted-brand">{slide.body}</p>
        </div>
        {/* Animated calorie ring counts up to the user's real target */}
        <div className="flex flex-col items-center">
          <div className="relative grid h-32 w-32 place-items-center">
            <div className="absolute inset-3 rounded-full bg-teal-brand/12 blur-2xl motion-safe:animate-pulse" aria-hidden="true" />
            <svg viewBox="0 0 120 120" className="h-32 w-32 -rotate-90" aria-hidden="true">
              <defs>
                <linearGradient id="calcRing" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#17453a" />
                  <stop offset="1" stopColor="#34d0b4" />
                </linearGradient>
              </defs>
              <circle cx="60" cy="60" r={RING_R} fill="none" strokeWidth="10" stroke="currentColor" className="text-forest/10" />
              <circle
                cx="60"
                cy="60"
                r={RING_R}
                fill="none"
                stroke="url(#calcRing)"
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={RING_C}
                strokeDashoffset={RING_C * (1 - frac)}
              />
            </svg>
            <div className="absolute inset-0 grid place-items-center text-center">
              {calories != null ? (
                <div>
                  <div className="text-[2.1rem] font-extrabold leading-none tracking-tight tabular-nums text-forest">
                    {calories.toLocaleString(calorieLocale)}
                  </div>
                  <div className="mt-1 text-[0.7rem] font-bold uppercase tracking-wide text-muted-brand">
                    {vi.calculating.unit}
                  </div>
                </div>
              ) : (
                <div className="text-[2.1rem] font-extrabold leading-none tabular-nums text-forest">
                  {Math.round(frac * 100)}%
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Macro split bars grow toward the real allocation */}
        {preview && (
          <section aria-label={vi.calculating.macroCaption} className="grid gap-2">
            <p className="text-center text-[0.68rem] font-bold uppercase tracking-wide text-muted-brand">
              {vi.calculating.macroCaption}
            </p>
            <div className="grid gap-1.5">
              {macros.map((m) => (
                <div key={m.label} className="flex items-center gap-2">
                  <span className="w-16 shrink-0 text-xs font-bold text-forest">{m.label}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-forest/8">
                    <div
                      className={cn('h-full rounded-full transition-[width] duration-150 ease-linear', m.color)}
                      style={{ width: `${Math.max((m.grams / macroMax) * 100 * frac, frac > 0 ? 6 : 0)}%` }}
                    />
                  </div>
                  <span className="w-12 shrink-0 text-right text-xs font-extrabold tabular-nums text-forest">
                    {Math.round(m.grams * frac)}g
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Itemised checklist, driven by real progress */}
        <ol className="grid gap-1.5">
          {steps.map((item, index) => {
            const done = complete || index < stage;
            const active = index === stage && !complete;
            const fill = done ? 100 : active ? Math.round(stageFrac * 100) : 0;
            return (
              <li
                key={item}
                className={cn(
                  'flex items-center gap-2.5 rounded-2xl px-3 py-1.5 transition-colors duration-500',
                  active ? 'bg-white/86 shadow-[inset_0_0_0_1px_rgb(31_168_146_/_0.28)]' : 'bg-white/45',
                )}
              >
                <span
                  className={cn(
                    'grid h-6 w-6 shrink-0 place-items-center rounded-full text-[0.68rem] font-extrabold transition-colors duration-500',
                    done
                      ? 'bg-[linear-gradient(135deg,#34d0b4,#1fa892)] text-white'
                      : active
                        ? 'bg-forest text-white'
                        : 'bg-forest/8 text-muted-brand',
                  )}
                >
                  {done ? '✓' : index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <span
                    className={cn(
                      'text-xs font-bold transition-colors duration-500',
                      done || active ? 'text-forest' : 'text-muted-brand',
                    )}
                  >
                    {item}
                  </span>
                  <div className="mt-1 h-0.5 overflow-hidden rounded-full bg-forest/8">
                    <div
                      className="h-full rounded-full bg-[linear-gradient(90deg,#1fa892,#34d0b4)] transition-[width] duration-150 ease-linear"
                      style={{ width: `${fill}%` }}
                    />
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </div>

      {/* Wait for user confirmation instead of auto-advancing */}
      <div className="mt-auto pt-4">
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
