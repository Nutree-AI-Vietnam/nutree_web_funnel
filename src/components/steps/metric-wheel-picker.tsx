'use client';

import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
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
// Rows past the window share one style so a flick does not restyle the whole list.
function depth(distance: number) {
  const clamped = Math.min(distance, 4);
  if (clamped === 0) return { scale: 1, opacity: 1 };
  const scale = Math.max(0.42, 1 - clamped * 0.26);
  const opacity = Math.max(0.14, 0.5 - (clamped - 1) * 0.19);
  return { scale, opacity };
}

const WheelOption = memo(function WheelOption({
  id,
  option,
  label,
  unit,
  itemHeight,
  scale,
  opacity,
  selected,
  centered,
  blankCenter,
  hero,
  onSelect,
}: {
  id: string;
  option: number;
  label: string;
  unit: string;
  itemHeight: number;
  scale: number;
  opacity: number;
  selected: boolean;
  centered: boolean;
  blankCenter: boolean;
  hero: boolean;
  onSelect: (option: number) => void;
}) {
  return (
    <div
      id={id}
      role="option"
      aria-selected={selected}
      onClick={() => onSelect(option)}
      className={cn(
        'flex w-full snap-center items-baseline justify-center gap-2 text-center font-extrabold tabular-nums',
        selected ? (hero ? 'text-[#0d0d0f]' : 'text-forest') : 'text-charcoal',
      )}
      style={{
        height: itemHeight,
        transform: `scale(${scale})`,
        opacity: blankCenter && centered ? 0 : selected ? 1 : opacity,
      }}
    >
      <span className={cn('leading-none', hero ? 'text-[3.2rem]' : 'text-[2.5rem]')}>{label}</span>
      {selected && unit && <span className="text-lg font-bold text-muted-brand">{unit}</span>}
    </div>
  );
});

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

    let settleTimer = 0;
    let frame = 0;

    const publish = () => {
      const row = itemHeightRef.current;
      const last = optionsRef.current.length - 1;
      const index = Math.min(last, Math.max(0, Math.round(list.scrollTop / row)));
      const next = optionsRef.current[index];
      if (next != null && next !== valueRef.current) onChangeRef.current(next);
    };

    // The browser owns the gesture. Writing scrollTop here would fight momentum and snap.
    const onScroll = () => {
      if (!initializedRef.current) return;
      scrollingRef.current = true;
      suppressClickRef.current = true;
      if (!frame) {
        frame = requestAnimationFrame(() => {
          frame = 0;
          publish();
        });
      }
      window.clearTimeout(settleTimer);
      settleTimer = window.setTimeout(() => {
        publish();
        scrollingRef.current = false;
        window.setTimeout(() => {
          suppressClickRef.current = false;
        }, 80);
      }, 140);
    };

    const swallowClickAfterDrag = (event: Event) => {
      if (!suppressClickRef.current) return;
      event.preventDefault();
      event.stopPropagation();
    };

    list.addEventListener('scroll', onScroll, { passive: true });
    list.addEventListener('click', swallowClickAfterDrag, true);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.clearTimeout(settleTimer);
      list.removeEventListener('scroll', onScroll);
      list.removeEventListener('click', swallowClickAfterDrag, true);
    };
  }, []);

  const selectOption = useCallback((option: number) => {
    if (suppressClickRef.current) return;
    onChangeRef.current(option);
  }, []);

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
          className="relative z-20 h-full overflow-hidden"
          style={{ WebkitMaskImage: FADE_MASK[variant], maskImage: FADE_MASK[variant] }}
        >
          <div
            ref={listRef}
            tabIndex={-1}
            className="wheel-picker-scroll h-full snap-y snap-mandatory overflow-y-auto overscroll-contain outline-none [overflow-anchor:none]"
            style={{ paddingBlock: padding }}
          >
            {options.map((option, index) => {
              const distance = Math.abs(index - centerIndex);
              const { scale, opacity } = depth(distance);
              return (
                <WheelOption
                  key={option}
                  id={`${id}-option-${index}`}
                  option={option}
                  label={formatValue(option)}
                  unit={unit}
                  itemHeight={itemHeight}
                  scale={scale}
                  opacity={opacity}
                  selected={activeIndex >= 0 && index === activeIndex}
                  centered={distance === 0}
                  blankCenter={activeIndex < 0}
                  hero={variant === 'hero'}
                  onSelect={selectOption}
                />
              );
            })}
          </div>
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
