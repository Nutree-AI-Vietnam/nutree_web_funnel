'use client';

import { useId } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { cn } from '@/lib/utils';

/** An iOS segmented control: a grey track with a white thumb that slides to the chosen segment. */
export function SegmentedControl<T extends string>({ options, value, onChange, label, className }: {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  className?: string;
}) {
  const thumb = useId();
  const reduce = useReducedMotion();
  return (
    <div role="radiogroup" aria-label={label} className={cn('inline-grid auto-cols-fr grid-flow-col rounded-[10px] bg-[#7676801f] p-[2px]', className)}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => { if (!active) onChange(option.value); }}
            className="relative isolate min-h-9 min-w-[5.5rem] px-4 text-[13px] font-semibold text-[#1c1c1e] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0a84ff]/50 rounded-[8px]"
          >
            {active && (
              <motion.span
                layoutId={thumb}
                aria-hidden="true"
                className="absolute inset-0 -z-10 rounded-[8px] border border-black/[0.04] bg-white shadow-[0_3px_8px_rgb(0_0_0_/_0.12),0_3px_1px_rgb(0_0_0_/_0.04)]"
                transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 520, damping: 40 }}
              />
            )}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
