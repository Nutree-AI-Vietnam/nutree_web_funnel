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
}: {
  title?: string;
  description?: string;
  hint?: string;
  eyebrow?: string;
  children: React.ReactNode;
  className?: string;
  titleClassName?: string;
}) {
  const items = Children.toArray(children);
  const last = items[items.length - 1];
  const footer = isStickyCta(last) ? last : null;
  const body = footer ? items.slice(0, -1) : items;
  const frameRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const [lift, setLift] = useState(0);
  // A list taller than the screen fades out at the bottom edge instead of being cut mid-line.
  const [fade, setFade] = useState(false);

  useLayoutEffect(() => {
    const frame = frameRef.current;
    const header = headerRef.current;
    const scroller = bodyRef.current;
    const stack = scroller?.firstElementChild as HTMLElement | null;
    if (!frame || !scroller || !stack) return;

    const measure = () => {
      if (frame.closest('[data-fit-viewport]')) {
        setLift(0);
        setFade(false);
        return;
      }
      const titleH = header?.offsetHeight ?? 0;
      const kids = [...stack.children] as HTMLElement[];
      const gap = kids.length > 1 ? 12 : 0;
      const contentH = kids.reduce((sum, el, index) => sum + el.offsetHeight + (index > 0 ? gap : 0), 0);
      const available = scroller.clientHeight;
      const overflows = contentH > available - 8;
      setFade(overflows);
      if (overflows || titleH === 0) {
        setLift(0);
        return;
      }
      const spaceAbove = (available - contentH) / 2;
      const chrome = frame.getBoundingClientRect().top;
      const next = Math.max(0, Math.min(titleH / 2 + chrome / 2, spaceAbove - 16));
      setLift((current) => (Math.abs(current - next) < 1 ? current : Math.round(next)));
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
  }, [title, description]);

  return (
    <div ref={frameRef} className={cn('quiz-step-frame relative flex min-h-0 flex-1 flex-col gap-3', className)}>
      {(eyebrow || title) && (
        <header ref={headerRef} className="shrink-0">
          {eyebrow && (
            <p className="mb-1 text-sm font-extrabold tracking-[0.02em] text-teal-brand">
              {eyebrow}
            </p>
          )}
          {title && (
            <h1 className={cn('max-w-[22rem] text-[clamp(1.7rem,6.4vw,2.05rem)] font-extrabold leading-[1.12] tracking-tight text-forest [text-wrap:balance]', titleClassName)}>
              {title}
            </h1>
          )}
          {description && <p className="mt-2 max-w-[24rem] text-base font-semibold leading-snug text-slate-brand">{description}</p>}
          {hint && <p className="mt-2 text-base font-semibold leading-relaxed text-muted-brand">{hint}</p>}
        </header>
      )}
      <div
        ref={bodyRef}
        className={cn('quiz-step-body -mx-5 min-h-0 flex-1 overflow-x-clip overflow-y-auto overscroll-contain px-5', fade && '[mask-image:linear-gradient(#000_calc(100%-28px),transparent)]')}
      >
        <div className={cn('quiz-step-stack flex min-h-full flex-col gap-3', fade && 'pb-7')} style={lift > 0 ? { translate: `0 -${lift}px` } : undefined}>
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
