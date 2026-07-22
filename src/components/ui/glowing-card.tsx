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
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      className={cn(
        'surface-grain group relative overflow-hidden rounded-[1.25rem] bg-white/86 shadow-[0_12px_34px_rgb(26_71_57_/_0.08),inset_0_1px_0_rgb(255_255_255_/_0.78)] backdrop-blur transition-colors duration-200',
        compact && 'rounded-[1rem] shadow-[0_10px_26px_rgb(26_71_57_/_0.07),inset_0_1px_0_rgb(255_255_255_/_0.76)]',
        active && 'bg-mist/86 shadow-[0_14px_36px_rgb(41_182_161_/_0.16),inset_0_0_0_1px_rgb(41_182_161_/_0.58)]',
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
