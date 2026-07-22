'use client';

import { cn } from '@/lib/utils';

export function BackgroundBeams({ className }: { className?: string }) {
  return (
    <div aria-hidden="true" className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)}>
      {/* Base wash */}
      <div className="absolute inset-0 bg-[linear-gradient(180deg,#e6f5ef_0%,#f7fbf9_46%,#ecf6f2_100%)]" />

      {/* Soft aurora orbs for depth */}
      <div className="animate-float-panel absolute -left-24 -top-28 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgb(52_208_180_/_0.30),transparent_70%)] blur-3xl" />
      <div className="absolute -right-20 top-16 h-80 w-80 rounded-full bg-[radial-gradient(circle,rgb(31_168_146_/_0.22),transparent_70%)] blur-3xl" />
      <div className="absolute -bottom-24 left-1/3 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgb(23_69_58_/_0.12),transparent_70%)] blur-3xl" />

      {/* Fine grain to avoid banding + add tactility */}
      <div className="absolute inset-0 opacity-[0.5] [background-image:radial-gradient(circle_at_18%_24%,rgb(23_69_58_/_0.05)_0_0.6px,transparent_0.7px),radial-gradient(circle_at_78%_64%,rgb(31_168_146_/_0.06)_0_0.6px,transparent_0.7px)] [background-size:16px_16px,21px_21px]" />

      {/* Bottom fade so content lifts off the page */}
      <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-bg-brand via-bg-brand/70 to-transparent" />
    </div>
  );
}
