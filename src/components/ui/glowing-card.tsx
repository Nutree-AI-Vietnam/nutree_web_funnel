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
        'surface-grain group relative overflow-hidden rounded-[1.25rem] bg-white/80 shadow-[inset_0_0_0_1px_rgb(255_255_255_/_0.6),0_2px_6px_rgb(16_39_32_/_0.05),0_14px_36px_rgb(16_39_32_/_0.10)] backdrop-blur-md transition-[transform,box-shadow,background-color] duration-300 hover:-translate-y-px',
        compact && 'rounded-[1rem]',
        active &&
          'bg-mist/88 shadow-[inset_0_0_0_1.5px_rgb(31_168_146_/_0.7),0_6px_16px_rgb(31_168_146_/_0.14),0_18px_44px_rgb(31_168_146_/_0.16)]',
        className,
      )}
    >
      <div
        aria-hidden="true"
        className={cn(
          'absolute inset-y-3 left-0 w-1 rounded-r-full bg-transparent transition duration-300',
          active && 'bg-teal-brand',
        )}
      />
      <div
        className={cn(
          'absolute inset-px rounded-[calc(1.25rem-1px)] bg-[linear-gradient(135deg,rgb(255_255_255_/_0.58),transparent_70%)]',
          compact && 'rounded-[calc(1rem-1px)]',
        )}
      />
      <div className="relative">{children}</div>
    </motion.div>
  );
}
