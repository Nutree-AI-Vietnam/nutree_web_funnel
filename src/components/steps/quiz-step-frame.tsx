'use client';

import { cn } from '@/lib/utils';

export function QuizStepFrame({
  title,
  hint,
  eyebrow,
  children,
  className,
  titleClassName,
}: {
  title?: string;
  hint?: string;
  eyebrow?: string;
  children: React.ReactNode;
  className?: string;
  titleClassName?: string;
}) {
  return (
    <div className={cn('flex flex-1 flex-col gap-4', className)}>
      {(eyebrow || title) && (
        <header>
          {eyebrow && (
            <p className="mb-1 text-xs font-extrabold uppercase tracking-wider text-teal-brand">
              {eyebrow}
            </p>
          )}
          {title && (
            <h1 className={cn('max-w-[20rem] text-[1.9rem] font-extrabold leading-[1.12] tracking-tight text-forest [text-wrap:balance]', titleClassName)}>
              {title}
            </h1>
          )}
          {hint && <p className="mt-2.5 text-sm font-semibold leading-relaxed text-muted-brand">{hint}</p>}
        </header>
      )}
      {children}
    </div>
  );
}
