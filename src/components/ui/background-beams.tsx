'use client';

import { cn } from '@/lib/utils';

export function BackgroundBeams({ className }: { className?: string }) {
  return (
    <div aria-hidden="true" className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)}>
      <div className="absolute inset-0 bg-[linear-gradient(180deg,#d8f3ec_0%,#f7fbf9_46%,#eef8f4_100%)]" />
      <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-bg-brand via-bg-brand/70 to-transparent" />
    </div>
  );
}
