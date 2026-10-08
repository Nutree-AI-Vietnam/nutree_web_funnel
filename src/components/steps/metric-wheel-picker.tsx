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
  const syncedItemHeightRef = useRef(0);
  const scrollEndRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const available = useWheelAvailableHeight(frameRef);
  const { itemHeight, height, padding } = wheelSize(available, variant);
  const options = useMemo(() => buildOptions(min, max, step), [min, max, step]);
  const activeIndex = value == null
    ? -1
    : Math.max(0, options.findIndex((option) => Math.abs(option - value) < step / 2 + 0.001));
  // A blank field starts at the minimum option but keeps the center marker empty.
  // The first deliberate wheel movement or click creates the selection.
  const centerIndex = activeIndex >= 0 ? activeIndex : 0;

  // Runs before paint so a row-height change never shows a stale scroll offset.
  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return;
    // Row height changes remap every scroll offset, so they resync even mid-scroll.
    const resized = syncedItemHeightRef.current !== itemHeight;
    if (resized || !scrollingRef.current) list.scrollTop = centerIndex * itemHeight;
    syncedItemHeightRef.current = itemHeight;
    initializedRef.current = true;
  }, [activeIndex, centerIndex, itemHeight]);

  useEffect(() => {
    return () => {
      if (scrollEndRef.current) clearTimeout(scrollEndRef.current);
    };
  }, []);

  useEffect(() => {
    if (autoFocus) listRef.current?.focus();
  }, [autoFocus]);

  const selectFromScroll = () => {
    if (!initializedRef.current) return;
    const list = listRef.current;
    if (!list) return;
    scrollingRef.current = true;
    if (scrollEndRef.current) clearTimeout(scrollEndRef.current);
    scrollEndRef.current = setTimeout(() => {
      scrollingRef.current = false;
    }, 140);
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
          className="wheel-picker-scroll relative z-20 h-full snap-y snap-mandatory overflow-y-auto overscroll-contain outline-none [overflow-anchor:none] [touch-action:pan-y]"
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
              <button
                id={`${id}-option-${index}`}
                key={option}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => onChange(option)}
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
              </button>
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
