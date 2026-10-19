'use client';

import Link from 'next/link';
import { NutreeLogo } from '@/components/nutree-logo';
import { BackgroundBeams } from '@/components/ui/background-beams';
import { useLocale } from '@/lib/copy/use-copy';
import { cn } from '@/lib/utils';

export function ConversionShell({
  children,
  className,
  hideLogo = false,
  stickyHeader,
  scrollable = true,
}: {
  children: React.ReactNode;
  className?: string;
  hideLogo?: boolean;
  stickyHeader?: React.ReactNode;
  scrollable?: boolean;
}) {
  const locale = useLocale();
  return (
    <main className={cn(
      'relative mx-auto flex h-dvh w-full max-w-lg flex-col overflow-hidden px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))]',
    )}>
      <BackgroundBeams />
      {!hideLogo && (
        <div className="relative z-10 mb-4 flex shrink-0 items-center">
          <Link href={`/survey/${locale}`} aria-label="Nutree" className="block h-11 w-11">
            <NutreeLogo priority className="h-11 w-11 shadow-[0_2px_8px_rgb(16_39_32_/_0.08)]" />
          </Link>
        </div>
      )}
      {stickyHeader}
      <div className={cn('relative z-10 flex min-h-0 flex-1 flex-col overflow-y-auto animate-soft-enter', scrollable && 'overscroll-contain', className)}>
        {children}
      </div>
    </main>
  );
}
