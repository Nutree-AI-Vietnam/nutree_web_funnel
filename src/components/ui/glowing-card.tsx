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
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      transition={{ type: 'spring', stiffness: 360, damping: 28 }}
      className={cn(
        'relative overflow-hidden rounded-2xl border border-white/70 bg-white/88 shadow-[0_18px_50px_rgb(26_71_57_/_0.10)] backdrop-blur',
        compact && 'rounded-[1.15rem] shadow-[0_10px_26px_rgb(26_71_57_/_0.07)]',
        active && 'border-teal-brand/70 bg-mist/88 shadow-[0_14px_36px_rgb(41_182_161_/_0.16)]',
        className,
      )}
    >
      <div
        className={cn(
          'absolute inset-px rounded-[calc(1rem-1px)] bg-[linear-gradient(135deg,rgb(255_255_255_/_0.70),transparent_42%,rgb(41_182_161_/_0.10))]',
          compact && 'rounded-[calc(1.15rem-1px)]',
        )}
      />
      <div className="relative">{children}</div>
    </motion.div>
  );
}
