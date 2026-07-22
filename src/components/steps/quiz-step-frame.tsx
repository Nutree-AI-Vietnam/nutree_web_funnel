'use client';

import { cn } from '@/lib/utils';

export function QuizStepFrame({
  title,
  hint,
  children,
  className,
  titleClassName,
}: {
  title?: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
  titleClassName?: string;
}) {
  return (
    <div className={cn('flex flex-1 flex-col gap-4', className)}>
      {title && (
        <header>
          <div className="mb-3 h-1 w-16 rounded-full bg-teal-brand" />
          <h1 className={cn('max-w-[20rem] text-[1.9rem] font-extrabold leading-tight text-forest [text-wrap:balance]', titleClassName)}>
            {title}
          </h1>
          {hint && <p className="mt-2 text-sm font-semibold leading-relaxed text-muted-brand">{hint}</p>}
        </header>
      )}
      {children}
    </div>
  );
}
