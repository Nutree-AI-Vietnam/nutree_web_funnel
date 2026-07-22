'use client';

import Image from 'next/image';
import Link from 'next/link';
import { BackgroundBeams } from '@/components/ui/background-beams';
import { cn } from '@/lib/utils';

export function ConversionShell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <main className={cn('relative mx-auto flex min-h-dvh w-full max-w-lg flex-col justify-center overflow-hidden px-5 py-6', className)}>
      <BackgroundBeams />
      <div className="relative z-10 mb-5 flex items-center justify-between">
        <Link href="/" aria-label="Nutree" className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/70 bg-white/70 shadow-sm backdrop-blur">
          <Image src="/nutree-logo-simple.png" alt="" width={72} height={64} priority className="h-8 w-8 object-contain" />
        </Link>
        <div className="h-px flex-1 bg-gradient-to-r from-teal-brand/40 via-white/70 to-transparent" />
      </div>
      <div className="relative z-10 animate-soft-enter">
        {children}
      </div>
    </main>
  );
}
