'use client';

import { useEffect, useMemo, useState } from 'react';

export interface SlideshowSlide {
  title: string;
  body: string;
  metric: string;
}

export function Slideshow({
  slides,
  autoPlayMs = 4200,
  initialIndex = 0,
}: {
  slides: readonly SlideshowSlide[];
  autoPlayMs?: number;
  initialIndex?: number;
}) {
  const [active, setActive] = useState(initialIndex);
  const [paused, setPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  const count = slides.length;
  const activeSlide = slides[active];

  const controls = useMemo(
    () => ({
      next: () => setActive((index) => (index + 1) % count),
      prev: () => setActive((index) => (index - 1 + count) % count),
      goTo: (index: number) => setActive(index),
    }),
    [count],
  );

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    if (paused || reducedMotion || count < 2) return;
    const id = window.setInterval(controls.next, autoPlayMs);
    return () => window.clearInterval(id);
  }, [autoPlayMs, controls.next, count, paused, reducedMotion]);

  if (!activeSlide) return null;

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Điểm nổi bật của Nutree"
      className="rounded-2xl border border-border-brand bg-white p-4 shadow-sm"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      onPointerDown={() => setPaused(true)}
      onKeyDown={(event) => {
        if (event.key === 'ArrowLeft') controls.prev();
        if (event.key === 'ArrowRight') controls.next();
      }}
      tabIndex={0}
    >
      <div className="grid min-h-36 grid-cols-[1fr_auto] gap-4">
        <div key={active} className="animate-soft-enter">
          <div className="mb-3 inline-flex rounded-full bg-mist px-3 py-1 text-sm font-bold text-emerald-brand">
            {activeSlide.metric}
          </div>
          <h2 className="text-xl font-extrabold text-forest">{activeSlide.title}</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-brand">{activeSlide.body}</p>
        </div>
        <div className="flex flex-col justify-between gap-3">
          <button
            type="button"
            onClick={controls.prev}
            aria-label="Slide trước"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-border-brand text-forest transition hover:bg-mist active:scale-95"
          >
            ←
          </button>
          <button
            type="button"
            onClick={controls.next}
            aria-label="Slide tiếp theo"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-border-brand text-forest transition hover:bg-mist active:scale-95"
          >
            →
          </button>
        </div>
      </div>

      <div className="mt-4 flex justify-center gap-2">
        {slides.map((slide, index) => (
          <button
            key={slide.title}
            type="button"
            onClick={() => controls.goTo(index)}
            aria-label={`Đến slide ${index + 1}`}
            aria-current={index === active}
            className={`h-2.5 rounded-full transition-all ${
              index === active ? 'w-7 bg-teal-brand' : 'w-2.5 bg-border-brand hover:bg-teal-brand/50'
            }`}
          />
        ))}
      </div>
    </section>
  );
}
