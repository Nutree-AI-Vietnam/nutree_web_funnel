'use client';

import { cn } from '@/lib/utils';

export function GlowingCard({
  children,
  className,
  compact,
}: {
  children: React.ReactNode;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        // Inset stroke only. An outer ring sits past the scrollport and the right radius gets cut off.
        'group relative overflow-hidden rounded-[0.85rem] bg-white shadow-[inset_0_0_0_1px_#d1d1d6]',
        compact && 'rounded-[0.75rem]',
        className,
      )}
    >
      <div className="relative">{children}</div>
    </div>
  );
}
