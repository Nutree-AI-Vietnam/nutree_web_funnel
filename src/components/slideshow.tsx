'use client';

import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import Image from 'next/image';

export interface SlideshowSlide {
  title: string;
  body: string;
  metric: string;
}

function SlideArtwork({ index, visualImage, compact }: { index: number; visualImage?: string; compact: boolean }) {
  if (visualImage) {
    return <Image src={visualImage} alt="" fill sizes="(max-width: 640px) calc(100vw - 3.5rem), 28rem" className="object-cover" />;
  }

  return (
    <>
      <div className="absolute -right-10 -top-12 h-36 w-36 rounded-full bg-[#f3b4aa]/35 blur-2xl" />
      <div className="absolute -bottom-16 -left-8 h-32 w-32 rounded-full bg-[#8bbca7]/35 blur-2xl" />
      {index === 1 && (
        <div className={`absolute inset-x-10 rounded-[2rem] bg-gradient-to-br from-[#dcebd2] via-[#f2c98d] to-[#dd8b72] shadow-[inset_0_0_0_8px_rgb(255_255_255_/_0.45),0_14px_25px_rgb(26_71_57_/_0.12)] ${compact ? 'bottom-3 top-3' : 'bottom-4 top-4'}`}>
          <div className="absolute left-7 top-7 h-16 w-16 rounded-full bg-[#f9f4dc]/90" />
          <div className="absolute right-8 top-10 h-10 w-20 rounded-full bg-[#7cae62]/85" />
          <div className="absolute bottom-7 left-1/2 h-16 w-16 -translate-x-1/2 rounded-full bg-[#e88b71]/90" />
        </div>
      )}
      {index >= 2 && (
        <svg viewBox="0 0 300 150" className={`absolute inset-0 h-full w-full ${compact ? 'p-3' : 'p-5'}`} aria-hidden="true">
          <path d="M18 124H282" stroke="#ffffff" strokeOpacity="0.65" strokeWidth="2" />
          <path d="M24 110C76 104 92 95 128 72s54-2 76-11 39-28 72-38" fill="none" stroke="#1f8a73" strokeLinecap="round" strokeWidth="6" />
          <circle cx="24" cy="110" r="7" fill="#1f8a73" stroke="white" strokeWidth="3" />
          <circle cx="272" cy="23" r="7" fill="#1f8a73" stroke="white" strokeWidth="3" />
        </svg>
      )}
    </>
  );
}

export function Slideshow({
  slides,
  autoPlayMs = 4200,
  initialIndex = 0,
  ariaLabel = 'Nutree highlights',
  visualImage,
  compact = false,
}: {
  slides: readonly SlideshowSlide[];
  autoPlayMs?: number;
  initialIndex?: number;
  ariaLabel?: string;
  visualImage?: string;
  compact?: boolean;
}) {
  const [active, setActive] = useState(initialIndex);
  const [paused, setPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const pointer = useRef<{ id: number; startX: number; startY: number; axis: 'x' | 'y' | null } | null>(null);

  const count = slides.length;
  const visualHeight = compact ? 'h-36' : 'h-40';

  const controls = useMemo(
    () => ({
      next: () => setActive((index) => (index + 1) % count),
      previous: () => setActive((index) => (index - 1 + count) % count),
    }),
    [count],
  );

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === 'ArrowRight') controls.next();
    if (event.key === 'ArrowLeft') controls.previous();
  };

  const handlePointerDown = (event: PointerEvent<HTMLElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    pointer.current = { id: event.pointerId, startX: event.clientX, startY: event.clientY, axis: null };
    event.currentTarget.setPointerCapture(event.pointerId);
    setPaused(true);
    setDragging(false);
  };

  const handlePointerMove = (event: PointerEvent<HTMLElement>) => {
    const gesture = pointer.current;
    if (!gesture || gesture.id !== event.pointerId) return;
    const deltaX = event.clientX - gesture.startX;
    const deltaY = event.clientY - gesture.startY;
    if (!gesture.axis && Math.max(Math.abs(deltaX), Math.abs(deltaY)) > 8) {
      gesture.axis = Math.abs(deltaX) > Math.abs(deltaY) ? 'x' : 'y';
    }
    if (gesture.axis !== 'x') return;
    event.preventDefault();
    setDragging(true);
    setDragX(deltaX);
  };

  const finishPointer = (event: PointerEvent<HTMLElement>) => {
    const gesture = pointer.current;
    if (!gesture || gesture.id !== event.pointerId) return;
    const deltaX = event.clientX - gesture.startX;
    if (gesture.axis === 'x' && Math.abs(deltaX) > 48) {
      if (deltaX < 0) controls.next();
      else controls.previous();
    }
    pointer.current = null;
    setDragX(0);
    setDragging(false);
    setPaused(false);
  };

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

  if (count === 0) return null;

  return (
    <section
      aria-roledescription="carousel"
      aria-label={ariaLabel}
      className={`rounded-2xl border border-border-brand bg-white shadow-sm ${compact ? 'p-3' : 'p-4'}`}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      onKeyDown={handleKeyDown}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={finishPointer}
      onPointerCancel={finishPointer}
      style={{ touchAction: 'pan-y' }}
      tabIndex={0}
    >
      <div className="overflow-hidden rounded-[1.35rem]">
        <div
          className={`flex ${dragging || reducedMotion ? '' : 'transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]'}`}
          style={{ transform: `translate3d(calc(-${active * 100}% + ${dragX}px), 0, 0)` }}
        >
          {slides.map((slide, index) => (
            <article key={slide.title} className="w-full shrink-0" aria-hidden={index !== active}>
              <div className={`relative mb-3 overflow-hidden rounded-[1.35rem] bg-gradient-to-br from-[#fff7f4] via-[#f9eee8] to-[#e5f2ec] ${visualHeight}`}>
                <SlideArtwork index={index} visualImage={index === 0 ? visualImage : undefined} compact={compact} />
              </div>
              <div className={`grid gap-3 ${compact ? 'min-h-24' : 'min-h-36'}`}>
                <div>
                  <div className={`inline-flex rounded-full bg-mist px-3 py-1 font-bold text-emerald-brand ${compact ? 'mb-2 text-xs' : 'mb-3 text-sm'}`}>
                    {slide.metric}
                  </div>
                  <h2 className={`${compact ? 'text-lg' : 'text-xl'} font-extrabold leading-tight text-forest`}>{slide.title}</h2>
                  <p className={`${compact ? 'mt-1 text-xs' : 'mt-2 text-sm'} leading-relaxed text-slate-brand`}>{slide.body}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>

      <div className={`${compact ? 'mt-3' : 'mt-4'} flex justify-center gap-2`}>
        {slides.map((slide, index) => (
          <span
            key={slide.title}
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
