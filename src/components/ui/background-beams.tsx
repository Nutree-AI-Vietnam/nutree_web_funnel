'use client';

import { cn } from '@/lib/utils';

export function BackgroundBeams({ className }: { className?: string }) {
  return (
    <div aria-hidden="true" className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)}>
      <div className="absolute left-1/2 top-[-22rem] h-[42rem] w-[42rem] -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_center,rgb(41_182_161_/_0.24),transparent_62%)]" />
      <div className="aceternity-beam aceternity-beam-one" />
      <div className="aceternity-beam aceternity-beam-two" />
      <div className="aceternity-beam aceternity-beam-three" />
      <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-bg-brand via-bg-brand/80 to-transparent" />
    </div>
  );
}
