'use client';

import { useEffect, useRef, useState } from 'react';
import { LOCALE_LABELS, LOCALE_NAMES, LOCALE_ORDER, type Locale } from '@/lib/copy';
import { cn } from '@/lib/utils';

export function LanguageMenu({
  active,
  onChange,
  placement = 'down',
}: {
  active: Locale;
  onChange?: (locale: Locale) => void;
  placement?: 'down' | 'up';
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', close);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={LOCALE_NAMES[active]}
        onClick={() => setOpen((value) => !value)}
        className="flex h-9 min-w-14 items-center justify-center gap-1 rounded-full border border-white/80 bg-white/90 px-2.5 text-forest shadow-[0_6px_16px_rgb(16_39_32_/_0.08)] transition hover:bg-white focus:outline-none focus-visible:ring-4 focus-visible:ring-teal-brand/20 active:scale-[0.97]"
      >
        <span className="px-1 text-xs font-bold leading-none">{LOCALE_LABELS[active]}</span>
        <svg viewBox="0 0 24 24" className={cn('size-4 transition-transform duration-200', open && 'rotate-180')} aria-hidden="true">
          <path d="M5.5 9.25 12 15.75 18.5 9.25" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <ul
          role="listbox"
          aria-label="Language / Ngôn ngữ"
          className={cn(
            'absolute z-30 w-56 overflow-hidden rounded-[1.25rem] border border-border-brand/80 bg-white/95 p-1.5 shadow-[0_18px_40px_rgb(16_39_32_/_0.16)] backdrop-blur-sm',
            placement === 'up' ? 'bottom-full left-1/2 mb-2 -translate-x-1/2' : 'right-0 mt-2',
          )}
        >
          {LOCALE_ORDER.map((locale) => {
            const selected = locale === active;
            return (
              <li key={locale}>
                <button
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => {
                    onChange?.(locale);
                    setOpen(false);
                  }}
                  className={cn('flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left text-base font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal-brand', selected ? 'bg-mist text-forest' : 'text-slate-brand hover:bg-mist/70')}
                >
                  <span className={cn('grid h-8 min-w-9 place-items-center rounded-lg px-1.5 text-xs font-extrabold tracking-wide', selected ? 'bg-white text-teal-brand shadow-sm' : 'bg-white/70 text-muted-brand')} aria-hidden="true">
                    {LOCALE_LABELS[locale]}
                  </span>
                  <span className="flex-1">{LOCALE_NAMES[locale]}</span>
                  {selected && (
                    <svg viewBox="0 0 20 20" className="size-4 text-teal-brand" aria-hidden="true">
                      <path d="m4.5 10.25 3.6 3.6 7.4-7.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
