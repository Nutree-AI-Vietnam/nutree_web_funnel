'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { useRouter } from 'next/navigation';
import { StoreRatings, storeRatingsLine } from '@/components/value-tour/value-tour-demos';
import { previewTdee } from '@/lib/api/client';
import { useCopy, useLocale } from '@/lib/copy/use-copy';
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
        ? loader.weights(formatWeight(data.weight_kg, system, locale), formatWeight(data.target_weight_kg, system, locale))
        : null,
      data.training_days_per_week ? loader.training(data.training_days_per_week) : loader.noTraining,
      diet ? loader.diet(diet) : loader.dietNone,
      moment ? loader.moment(moment) : null,
      loader.calories,
    ].filter((item): item is string => Boolean(item));
  }, [data, loader, locale, system, vi]);
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

  const rating = vi.funnel.rating;
  const reviews = vi.calculating.testimonials;
  const slides = useMemo(() => (reviews.length
    ? reviews.map((review) => ({ kind: 'review' as const, key: review.name, review }))
    : vi.calculating.highlights.map((item) => ({ kind: 'highlight' as const, key: item.title, item }))), [reviews, vi]);
  const [slideIndex, setSlideIndex] = useState(0);
  const stage = Math.min(items.length, Math.floor(elapsed / stageMs));

  useEffect(() => {
    if (reduce || slides.length < 2) return;
    const id = window.setInterval(() => setSlideIndex((index) => (index + 1) % slides.length), 2800);
    return () => window.clearInterval(id);
  }, [reduce, slides.length]);

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
        {/* One bar per answer, filling in turn, so the plan visibly builds from what the visitor said. */}
        <section className="rounded-[1.6rem] bg-white/90 px-4 py-3.5 shadow-[0_6px_16px_rgb(23_69_58_/_0.07),inset_0_1px_0_rgb(255_255_255_/_0.8)]">
          <ol className="grid gap-2.5">
            {items.map((item, index) => {
              const progress = complete ? 1 : Math.min(1, Math.max(0, (elapsed - index * stageMs) / stageMs));
              const done = progress >= 1;
              const waiting = progress <= 0;
              return (
                <li key={item}>
                  <div className={cn('flex items-center justify-between gap-3 text-[0.86rem] font-bold transition-colors duration-300', waiting ? 'text-muted-brand/70' : 'text-forest')}>
                    <span className="ph-mask flex min-w-0 items-center gap-2">
                      <span aria-hidden="true" className={cn('grid h-4.5 w-4.5 shrink-0 place-items-center rounded-full text-[0.6rem] font-black transition-colors duration-300', done ? 'bg-teal-brand text-white' : 'bg-forest/8 text-transparent')}>✓</span>
                      <span className="min-w-0">{item}</span>
                    </span>
                    <span className="shrink-0 tabular-nums text-[0.78rem] text-muted-brand">{Math.round(progress * 100)}%</span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-forest/8" aria-hidden="true">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-forest to-teal-bright"
                      style={{ width: `${progress * 100}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ol>
        </section>

        {/* Proof while the plan builds: the real rating and customer count, then a carousel that peeks the next card.
            Real App Store reviews where the copy has them (Vietnamese); otherwise what the app does. */}
        <section aria-label={vi.calculating.testimonialsLabel} className="mt-1">
          <p className="text-center text-[1rem] font-extrabold text-forest">{rating.countValue} {rating.chose}</p>
          <StoreRatings className="mt-1 text-[0.8rem]" />
          <p className="sr-only">{storeRatingsLine(rating)}</p>
          <div className="mt-2 overflow-hidden">
            <motion.ol
              className="flex gap-[2.5%]"
              // 7% = half the space beside an 86% card, so the active card sits centered and both neighbours peek.
              animate={{ x: `${7 - slideIndex * 88.5}%` }}
              transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 120, damping: 22 }}
            >
              {slides.map((slide, index) => (
                <li key={slide.key} aria-hidden={index !== slideIndex} className={cn('w-[86%] shrink-0 rounded-[1.3rem] bg-white/90 px-4 py-3 shadow-[0_12px_32px_rgb(26_71_57_/_0.08),inset_0_1px_0_rgb(255_255_255_/_0.8)]', slide.kind === 'highlight' && 'text-center')}>
                  {slide.kind === 'review' ? (
                    <>
                      <div className="flex items-center gap-2.5">
                        {/* App Store reviews carry no photo, so the avatar is the reviewer's initial. */}
                        <span aria-hidden="true" className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-mist text-[0.85rem] font-extrabold uppercase text-forest">{slide.review.name.charAt(0)}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[0.86rem] font-extrabold leading-tight text-forest">{slide.review.name}</span>
                          <span className="mt-0.5 flex items-center gap-1.5 text-[0.68rem] font-bold leading-none text-muted-brand">
                            <span className="shrink-0 text-[0.8rem] tracking-[-0.05em] text-[#e3a542]" aria-label={`${slide.review.stars}/5`}>{'★'.repeat(slide.review.stars)}<span className="text-forest/15">{'★'.repeat(5 - slide.review.stars)}</span></span>
                            {/* A stated result says the goal already; otherwise the goal, when the review names one. */}
                            {slide.review.result
                              ? <span className="shrink-0 rounded-full bg-teal-brand/12 px-2 py-0.5 font-extrabold text-teal-brand">{slide.review.result}</span>
                              : slide.review.goal && <span className="shrink-0">{slide.review.goal}</span>}
                            <span className="truncate">App Store · {slide.review.date}</span>
                          </span>
                        </span>
                      </div>
                      <blockquote className="mt-1.5 line-clamp-2 text-[0.84rem] font-semibold leading-snug text-slate-brand">“{slide.review.quote}”</blockquote>
                    </>
                  ) : (
                    <>
                      <p className="text-[0.92rem] font-extrabold leading-snug text-forest">{slide.item.title}</p>
                      <p className="mt-1 text-[0.8rem] font-semibold leading-snug text-muted-brand">{slide.item.body}</p>
                    </>
                  )}
                </li>
              ))}
            </motion.ol>
          </div>
          <div className="mt-2 flex justify-center gap-1.5" aria-hidden="true">
            {slides.map((slide, index) => (
              <span key={slide.key} className={cn('h-1.5 rounded-full transition-all duration-300', index === slideIndex ? 'w-5 bg-teal-brand' : 'w-1.5 bg-forest/15')} />
            ))}
          </div>
          {reviews.length > 0 && <p className="mt-1.5 text-center text-[0.66rem] font-semibold text-muted-brand">{vi.calculating.testimonialsSource}. {vi.calculating.testimonialsNote}</p>}
        </section>
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
