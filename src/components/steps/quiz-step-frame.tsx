'use client';

import { Children, isValidElement, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

function isStickyCta(node: ReactNode) {
  if (!isValidElement<{ className?: string }>(node)) return false;
  const className = node.props.className;
  return typeof className === 'string' && className.includes('mt-auto');
}

export function QuizStepFrame({
  title,
  description,
  hint,
  eyebrow,
  children,
  className,
  titleClassName,
  pinTop,
}: {
  title?: string;
  description?: string;
  hint?: string;
  eyebrow?: string;
  children: React.ReactNode;
  className?: string;
  titleClassName?: string;
  /** Keep a short screen under the header. The default centers short screens. */
  pinTop?: boolean;
}) {
  const items = Children.toArray(children);
  const last = items[items.length - 1];
  const footer = isStickyCta(last) ? last : null;
  const body = footer ? items.slice(0, -1) : items;
  const frameRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  // A list taller than the screen fades out at the bottom edge instead of being cut mid-line.
  const [fade, setFade] = useState(false);

  useLayoutEffect(() => {
    const frame = frameRef.current;
    const header = headerRef.current;
    const scroller = bodyRef.current;
    const stack = scroller?.firstElementChild as HTMLElement | null;
    if (!frame || !scroller || !stack) return;

    const measure = () => {
      if (pinTop || frame.closest('[data-fit-viewport]')) {
        setFade(false);
        return;
      }
      const kids = [...stack.children] as HTMLElement[];
      const gap = kids.length > 1 ? 12 : 0;
      const contentH = kids.reduce((sum, el, index) => sum + el.offsetHeight + (index > 0 ? gap : 0), 0);
      setFade(contentH > scroller.clientHeight - 8);
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(scroller);
    if (header) observer.observe(header);
    // A row that appears later (the reply under the confidence options) changes the lift, and a stale lift
    // would push the first row out of view. Only added or removed rows trigger this: watching row sizes would
    // loop on screens whose rows fill the height, because the fade's bottom padding resizes them again.
    const rows = new MutationObserver(measure);
    rows.observe(stack, { childList: true });
    return () => { observer.disconnect(); rows.disconnect(); };
  }, [title, description, pinTop]);

  return (
    <div ref={frameRef} data-pin-top={pinTop ? '' : undefined} className={cn('quiz-step-frame relative flex min-h-0 flex-1 flex-col gap-3 pt-4', className)}>
      {(eyebrow || title) && (
        <header ref={headerRef} className="shrink-0 text-center">
          {eyebrow && (
            <p className="mb-1 text-sm font-extrabold tracking-[0.02em] text-teal-brand">
              {eyebrow}
            </p>
          )}
          {title && (
            <h1 className={cn('mx-auto max-w-[22rem] text-[clamp(1.5rem,5.6vw,1.75rem)] font-extrabold leading-[1.18] tracking-tight text-forest [text-wrap:balance]', titleClassName)}>
              {title}
            </h1>
          )}
          {description && <p className="mx-auto mt-2 max-w-[24rem] text-base font-semibold leading-snug text-slate-brand">{description}</p>}
          {hint && <p className="mx-auto mt-2 max-w-[24rem] text-base font-semibold leading-relaxed text-muted-brand">{hint}</p>}
        </header>
      )}
      <div
        ref={bodyRef}
        className={cn('quiz-step-body min-h-0 flex-1 overflow-y-auto overscroll-contain', fade && '[mask-image:linear-gradient(#000_calc(100%-28px),transparent)]')}
      >
        <div className={cn('quiz-step-stack flex min-h-full flex-col gap-3 pt-1', fade && 'pb-7')}>
          {body}
        </div>
      </div>
      {footer && (
        <div className="quiz-step-cta relative z-20 shrink-0 pt-3 [&_.mt-auto]:mt-0">
          {footer}
        </div>
      )}
    </div>
  );
}
