'use client';

import { useEffect, useMemo, useRef } from 'react';
import { cn } from '@/lib/utils';

const ITEM_HEIGHT = 44;
const VISIBLE_ITEMS = 5;

function buildOptions(min: number, max: number, step: number): number[] {
  const count = Math.floor((max - min) / step) + 1;
  return Array.from({ length: count }, (_, index) => Number((min + index * step).toFixed(2)));
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
      className="relative h-[220px] overflow-hidden rounded-[1.7rem] border border-border-brand bg-white/90 shadow-inner outline-none focus:ring-4 focus:ring-teal-brand/15"
      onKeyDown={(event) => {
        if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
        event.preventDefault();
        const direction = event.key === 'ArrowUp' ? -1 : 1;
        const next = options[Math.min(options.length - 1, Math.max(0, activeIndex + direction))];
        onChange(next);
      }}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-20 bg-gradient-to-b from-white via-white/90 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-20 bg-gradient-to-t from-white via-white/90 to-transparent" />
      <div className="pointer-events-none absolute left-4 right-4 top-1/2 z-10 h-12 -translate-y-1/2 rounded-2xl border-2 border-teal-brand bg-mist/45 shadow-[0_0_0_7px_rgb(41_182_161_/_0.08)]" />
      <div
        ref={listRef}
        tabIndex={-1}
        className="wheel-picker-scroll relative z-20 h-full snap-y snap-mandatory overflow-y-auto overscroll-contain outline-none"
        style={{ paddingBlock: verticalPadding }}
        onScroll={selectFromScroll}
      >
        {options.map((option, index) => {
          const active = index === activeIndex;
          return (
            <button
              id={`${id}-option-${index}`}
              key={option}
              type="button"
              role="option"
              aria-selected={active}
              onClick={() => onChange(option)}
              className={cn(
                'flex h-11 w-full snap-center items-center justify-center gap-2 text-center transition',
                active ? 'text-[2rem] font-extrabold text-forest' : 'text-lg font-bold text-muted-brand/45',
              )}
            >
              <span>{formatValue(option)}</span>
              {active && <span className="text-base font-extrabold text-muted-brand">{unit}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
