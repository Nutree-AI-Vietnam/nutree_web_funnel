'use client';

import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { cn } from '@/lib/utils';
import { useWheelAvailableHeight } from './use-wheel-available-height';
import { WHEEL_MIN_HEIGHT, wheelSize, type WheelVariant } from './wheel-size';

export type { WheelVariant } from './wheel-size';

// Fades the rows above and below the centered one.
const FADE_MASK: Record<WheelVariant, string> = {
  hero: 'linear-gradient(to bottom, transparent 0%, #000 25%, #000 75%, transparent 100%)',
  default: 'linear-gradient(to bottom, transparent 0%, #000 26%, #000 74%, transparent 100%)',
};

function buildOptions(min: number, max: number, step: number): number[] {
  const count = Math.floor((max - min) / step) + 1;
  return Array.from({ length: count }, (_, index) => Number((min + index * step).toFixed(2)));
}

// iOS-style depth: uniform base size, scaled + faded by distance from the center.
function depth(distance: number) {
  if (distance === 0) return { scale: 1, opacity: 1 };
  const scale = Math.max(0.42, 1 - distance * 0.26);
  const opacity = Math.max(0.14, 0.5 - (distance - 1) * 0.19);
  return { scale, opacity };
}

export function MetricWheelPicker({
  id,
  label,
  value,
  unit,
  min,
  max,
  step,
  onChange,
  formatValue,
  autoFocus,
  variant = 'default',
}: {
  id: string;
  label: string;
  value: number | null;
  unit: string;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  formatValue: (value: number) => string;
  autoFocus?: boolean;
  variant?: WheelVariant;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef(false);
  const scrollingRef = useRef(false);
  const suppressClickRef = useRef(false);
  const syncedItemHeightRef = useRef(0);
  const valueRef = useRef(value);
  const onChangeRef = useRef(onChange);
  valueRef.current = value;
  onChangeRef.current = onChange;

  const available = useWheelAvailableHeight(frameRef);
  const { itemHeight, height, padding } = wheelSize(available, variant);
  const options = useMemo(() => buildOptions(min, max, step), [min, max, step]);
  const itemHeightRef = useRef(itemHeight);
  const optionsRef = useRef(options);
  itemHeightRef.current = itemHeight;
  optionsRef.current = options;
  const activeIndex = value == null
    ? -1
    : Math.max(0, options.findIndex((option) => Math.abs(option - value) < step / 2 + 0.001));
  // A blank field starts at the minimum option but keeps the center marker empty.
  // The first deliberate wheel movement or click creates the selection.
  const centerIndex = activeIndex >= 0 ? activeIndex : 0;

  // Runs before paint so a row-height change never shows a stale scroll offset.
  // A drag owns scrollTop until it settles; snapping here would cancel the gesture.
  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const resized = syncedItemHeightRef.current !== itemHeight;
    if (!scrollingRef.current && (resized || Math.abs(list.scrollTop - centerIndex * itemHeight) > 1)) {
      list.scrollTop = centerIndex * itemHeight;
    }
    syncedItemHeightRef.current = itemHeight;
    initializedRef.current = true;
  }, [activeIndex, centerIndex, itemHeight]);

  useEffect(() => {
    if (autoFocus) listRef.current?.focus();
  }, [autoFocus]);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;

    let pointerId: number | null = null;
    let lastY = 0;
    let lastTime = 0;
    let velocity = 0;
    let dragDistance = 0;
    let frame = 0;
    let settleTimer = 0;

    const stopMomentum = () => {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
    };

    const publishIndex = (index: number) => {
      const next = optionsRef.current[index];
      if (next != null && next !== valueRef.current) onChangeRef.current(next);
    };

    const settle = () => {
      const row = itemHeightRef.current;
      const last = optionsRef.current.length - 1;
      const index = Math.min(last, Math.max(0, Math.round(list.scrollTop / row)));
      list.scrollTop = index * row;
      publishIndex(index);
      settleTimer = window.setTimeout(() => {
        scrollingRef.current = false;
      }, 40);
    };

    const coast = () => {
      const row = itemHeightRef.current;
      const max = Math.max(0, (optionsRef.current.length - 1) * row);
      velocity *= 0.92;
      if (Math.abs(velocity) < 0.02) {
        settle();
        return;
      }
      list.scrollTop = Math.min(max, Math.max(0, list.scrollTop - velocity * 16));
      frame = requestAnimationFrame(coast);
    };

    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0) return;
      stopMomentum();
      window.clearTimeout(settleTimer);
      suppressClickRef.current = false;
      pointerId = event.pointerId;
      lastY = event.clientY;
      lastTime = event.timeStamp;
      velocity = 0;
      dragDistance = 0;
      scrollingRef.current = true;
      try {
        list.setPointerCapture(event.pointerId);
      } catch {
        // Synthetic events and some browsers refuse capture; the list still receives the move.
      }
    };

    const onPointerMove = (event: PointerEvent) => {
      if (pointerId !== event.pointerId) return;
      const dy = event.clientY - lastY;
      const dt = Math.max(event.timeStamp - lastTime, 8);
      lastY = event.clientY;
      lastTime = event.timeStamp;
      dragDistance += Math.abs(dy);
      velocity = Math.max(-2.2, Math.min(2.2, dy / dt));
      const row = itemHeightRef.current;
      const max = Math.max(0, (optionsRef.current.length - 1) * row);
      list.scrollTop = Math.min(max, Math.max(0, list.scrollTop - dy));
    };

    const onPointerUp = (event: PointerEvent) => {
      if (pointerId !== event.pointerId) return;
      pointerId = null;
      if (dragDistance < 6) {
        scrollingRef.current = false;
        return;
      }
      suppressClickRef.current = true;
      window.setTimeout(() => {
        suppressClickRef.current = false;
      }, 350);
      frame = requestAnimationFrame(coast);
    };

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      stopMomentum();
      window.clearTimeout(settleTimer);
      scrollingRef.current = true;
      const row = itemHeightRef.current;
      const delta = event.deltaMode === 1 ? event.deltaY * row : event.deltaMode === 2 ? event.deltaY * list.clientHeight : event.deltaY;
      const max = Math.max(0, (optionsRef.current.length - 1) * row);
      list.scrollTop = Math.min(max, Math.max(0, list.scrollTop + delta));
      settleTimer = window.setTimeout(settle, 120);
    };

    list.addEventListener('pointerdown', onPointerDown);
    list.addEventListener('pointermove', onPointerMove);
    list.addEventListener('pointerup', onPointerUp);
    list.addEventListener('pointercancel', onPointerUp);
    list.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      stopMomentum();
      window.clearTimeout(settleTimer);
      list.removeEventListener('pointerdown', onPointerDown);
      list.removeEventListener('pointermove', onPointerMove);
      list.removeEventListener('pointerup', onPointerUp);
      list.removeEventListener('pointercancel', onPointerUp);
      list.removeEventListener('wheel', onWheel);
    };
  }, []);

  const selectFromScroll = () => {
    if (!initializedRef.current || !scrollingRef.current) return;
    const list = listRef.current;
    if (!list) return;
    const index = Math.min(
      options.length - 1,
      Math.max(0, Math.round(list.scrollTop / itemHeight)),
    );
    const next = options[index];
    if (next !== value) onChange(next);
  };

  return (
    // The frame takes whatever height the step leaves free; the wheel is absolutely
    // positioned inside it so its own size never feeds back into that measurement.
    <div ref={frameRef} className="relative w-full flex-1" style={{ minHeight: WHEEL_MIN_HEIGHT }}>
      <div
        id={id}
        role="listbox"
        aria-label={label}
        aria-activedescendant={activeIndex >= 0 ? `${id}-option-${activeIndex}` : undefined}
        tabIndex={0}
        className={cn(
          'absolute inset-0 m-auto w-full overflow-hidden outline-none focus-visible:ring-4 focus-visible:ring-teal-brand/15',
          variant === 'hero' ? 'max-w-[22rem]' : 'max-w-[20rem] rounded-3xl',
        )}
        style={{ height }}
        onKeyDown={(event) => {
          if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
          event.preventDefault();
          const direction = event.key === 'ArrowUp' ? -1 : 1;
          const currentIndex = activeIndex >= 0 ? activeIndex : centerIndex;
          const next = options[Math.min(options.length - 1, Math.max(0, currentIndex + direction))];
          onChange(next);
        }}
      >
        {variant !== 'hero' && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-6 top-1/2 z-10 -translate-y-1/2 border-y border-forest/10"
            style={{ height: itemHeight }}
          />
        )}
        <div
          ref={listRef}
          tabIndex={-1}
          className="wheel-picker-scroll relative z-20 h-full cursor-grab snap-y snap-mandatory overflow-y-auto overscroll-contain outline-none [overflow-anchor:none] active:cursor-grabbing"
          style={{
            paddingBlock: padding,
            WebkitMaskImage: FADE_MASK[variant],
            maskImage: FADE_MASK[variant],
          }}
          onScroll={selectFromScroll}
        >
          {options.map((option, index) => {
            const distance = Math.abs(index - centerIndex);
            const centered = distance === 0;
            const selected = activeIndex >= 0 && index === activeIndex;
            const { scale, opacity } = depth(distance);
            return (
              <div
                id={`${id}-option-${index}`}
                key={option}
                role="option"
                aria-selected={selected}
                onClick={() => {
                  if (suppressClickRef.current) {
                    suppressClickRef.current = false;
                    return;
                  }
                  onChange(option);
                }}
                className={cn(
                  'flex w-full snap-center items-baseline justify-center gap-2 text-center font-extrabold tabular-nums transition-[transform,opacity,color] duration-200 ease-out will-change-transform',
                  selected
                    ? variant === 'hero' ? 'text-[#0d0d0f]' : 'text-forest'
                    : 'text-charcoal',
                )}
                style={{
                  height: itemHeight,
                  transform: `scale(${scale})`,
                  opacity: selected ? 1 : activeIndex < 0 && centered ? 0 : opacity,
                }}
              >
                <span className={cn('leading-none', variant === 'hero' ? selected ? 'text-[3.2rem]' : 'text-[2.4rem]' : 'text-[2.5rem]')}>
                  {formatValue(option)}
                </span>
                {selected && <span className="text-lg font-bold text-muted-brand">{unit}</span>}
              </div>
            );
          })}
        </div>
        {activeIndex < 0 && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-1/2 z-30 -translate-y-1/2 text-center text-[2.8rem] font-extrabold leading-none text-charcoal/50"
          >
            —
          </span>
        )}
      </div>
    </div>
  );
}
