'use client';

import { animate, useInView, useReducedMotion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';

/**
 * A number that counts up from zero the first time it scrolls into view.
 * Shows the final value straight away when the visitor prefers reduced motion.
 */
export function CountUp({ value, format, duration = 1.1, delay = 0, className }: {
  value: number;
  format: (value: number) => string;
  duration?: number;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '0px 0px -10% 0px' });
  const reduce = useReducedMotion();
  const [shown, setShown] = useState<number | null>(null);

  useEffect(() => {
    if (!inView || reduce) return;
    const controls = animate(0, value, { duration, delay, ease: [0.16, 1, 0.3, 1], onUpdate: setShown });
    return () => controls.stop();
  }, [inView, reduce, value, duration, delay]);

  const display = reduce ? value : shown ?? 0;
  // Screen readers get the final value once; the counting digits are visual only.
  return (
    <span ref={ref} className={className}>
      <span aria-hidden="true">{format(display)}</span>
      <span className="sr-only">{format(value)}</span>
    </span>
  );
}
