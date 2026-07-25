'use client';

import Image from 'next/image';
import Link from 'next/link';
import { BackgroundBeams } from '@/components/ui/background-beams';
import { cn } from '@/lib/utils';

export function ConversionShell({
  children,
  className,
  hideLogo = false,
  stickyHeader,
}: {
  children: React.ReactNode;
  className?: string;
  hideLogo?: boolean;
  stickyHeader?: React.ReactNode;
}) {
  return (
    <main className="relative mx-auto flex min-h-dvh w-full max-w-lg flex-col overflow-x-hidden overflow-y-auto px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top))]">
      <BackgroundBeams />
      {!hideLogo && (
        <div className="relative z-10 mb-6 flex items-center">
          <Link href="/" aria-label="Nutree" className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/70 bg-white/70 shadow-[inset_0_0_0_1px_rgb(255_255_255_/_0.5),0_2px_8px_rgb(16_39_32_/_0.06)] backdrop-blur">
            <Image src="/nutree-logo-simple.png" alt="" width={72} height={64} priority className="h-8 w-8 object-contain" />
          </Link>
        </div>
      )}
      {stickyHeader}
      <div className={cn('relative z-10 flex flex-1 flex-col animate-soft-enter', className)}>
        {children}
      </div>
    </main>
  );
}
