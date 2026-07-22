'use client';

import { useEffect, useMemo, useRef } from 'react';
import { cn } from '@/lib/utils';

const ITEM_HEIGHT = 56;
const VISIBLE_ITEMS = 5;

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
}: {
  id: string;
  label: string;
  value: number;
  unit: string;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  formatValue: (value: number) => string;
  autoFocus?: boolean;
}) {
  const listRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef(false);
  const scrollingRef = useRef(false);
  const scrollEndRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const options = useMemo(() => buildOptions(min, max, step), [min, max, step]);
  const activeIndex = Math.max(
    0,
    options.findIndex((option) => Math.abs(option - value) < step / 2 + 0.001),
  );
  const verticalPadding = ((VISIBLE_ITEMS - 1) / 2) * ITEM_HEIGHT;

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    if (!initializedRef.current || !scrollingRef.current) {
      list.scrollTop = activeIndex * ITEM_HEIGHT;
      initializedRef.current = true;
    }
  }, [activeIndex]);

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
      Math.max(0, Math.round(list.scrollTop / ITEM_HEIGHT)),
    );
    const next = options[index];
    if (next !== value) onChange(next);
  };

  return (
    <div
      id={id}
      role="listbox"
      aria-label={label}
      aria-activedescendant={`${id}-option-${activeIndex}`}
      tabIndex={0}
      className="relative mx-auto h-[280px] w-full max-w-[20rem] overflow-hidden rounded-3xl outline-none focus-visible:ring-4 focus-visible:ring-teal-brand/15"
      style={{ height: VISIBLE_ITEMS * ITEM_HEIGHT }}
      onKeyDown={(event) => {
        if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
        event.preventDefault();
        const direction = event.key === 'ArrowUp' ? -1 : 1;
        const next = options[Math.min(options.length - 1, Math.max(0, activeIndex + direction))];
        onChange(next);
      }}
    >
      {/* Subtle iOS selection guides framing the centered value */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-6 top-1/2 z-10 -translate-y-1/2 border-y border-forest/10"
        style={{ height: ITEM_HEIGHT }}
      />
      <div
        ref={listRef}
        tabIndex={-1}
        className="wheel-picker-scroll relative z-20 h-full snap-y snap-mandatory overflow-y-auto overscroll-contain outline-none [touch-action:pan-y]"
        style={{
          paddingBlock: verticalPadding,
          WebkitMaskImage:
            'linear-gradient(to bottom, transparent 0%, #000 26%, #000 74%, transparent 100%)',
          maskImage:
            'linear-gradient(to bottom, transparent 0%, #000 26%, #000 74%, transparent 100%)',
        }}
        onScroll={selectFromScroll}
      >
        {options.map((option, index) => {
          const distance = Math.abs(index - activeIndex);
          const active = distance === 0;
          const { scale, opacity } = depth(distance);
          return (
            <button
              id={`${id}-option-${index}`}
              key={option}
              type="button"
              role="option"
              aria-selected={active}
              onClick={() => onChange(option)}
              className={cn(
                'flex w-full snap-center items-baseline justify-center gap-2 text-center font-extrabold tabular-nums transition-[transform,opacity,color] duration-200 ease-out will-change-transform',
                active ? 'text-forest' : 'text-charcoal',
              )}
              style={{ height: ITEM_HEIGHT, transform: `scale(${scale})`, opacity }}
            >
              <span className="text-[2.5rem] leading-none">{formatValue(option)}</span>
              {active && <span className="text-lg font-bold text-muted-brand">{unit}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
