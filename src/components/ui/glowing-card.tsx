'use client';

import { motion } from 'motion/react';
import { cn } from '@/lib/utils';

export function GlowingCard({
  children,
  className,
  active,
  compact,
}: {
  children: React.ReactNode;
  className?: string;
  active?: boolean;
  compact?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        // iOS grouped-row look: white fill and a hairline, no large drop shadow (a big blur gets clipped by the scrolling list into a grey band).
        'group relative overflow-hidden rounded-[1.25rem] bg-white shadow-[0_0_0_1px_rgb(16_39_32_/_0.06),0_1px_2px_rgb(16_39_32_/_0.04)] transition-[box-shadow,background-color] duration-200',
        compact && 'rounded-[1rem]',
        active &&
          'bg-mist shadow-[inset_0_0_0_1.5px_rgb(23_69_58_/_0.55)]',
        className,
      )}
    >
      <div className="relative">{children}</div>
    </motion.div>
  );
}
