'use client';

import { animate, useReducedMotion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';

/**
 * A number that counts up from zero when it mounts.
 * Shows the final value straight away when the visitor prefers reduced motion.
 * Visibility observers missed numbers inside overflow scrollers and the gift ticket, so those stayed on 0.
 */
export function CountUp({ value, format, duration = 1.1, delay = 0, className }: {
  value: number;
  format: (value: number) => string;
  duration?: number;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const reduce = useReducedMotion();
  const [shown, setShown] = useState<number | null>(reduce ? value : null);

  useEffect(() => {
    if (reduce) {
      setShown(value);
      return;
    }
    const controls = animate(0, value, {
      duration,
      delay,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: setShown,
      onComplete: () => setShown(value),
    });
    const settle = window.setTimeout(() => setShown(value), (delay + duration) * 1000 + 80);
    return () => {
      controls.stop();
      window.clearTimeout(settle);
    };
  }, [reduce, value, duration, delay]);

  const display = reduce ? value : shown ?? 0;
  // Screen readers get the final value once; the counting digits are visual only.
  return (
    <span ref={ref} className={className}>
      <span aria-hidden="true">{format(display)}</span>
      <span className="sr-only">{format(value)}</span>
    </span>
  );
}
