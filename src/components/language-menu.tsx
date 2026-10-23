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
        className="flex h-8 items-center gap-0.5 rounded-full border border-white/80 bg-white/85 pl-2 pr-1 text-forest shadow-[0_6px_16px_rgb(16_39_32_/_0.08)] focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-brand"
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
            'absolute z-30 w-56 overflow-hidden rounded-2xl border border-white/80 bg-white py-1 shadow-[0_18px_40px_rgb(16_39_32_/_0.16)]',
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
                  className={cn('flex min-h-12 w-full items-center gap-3 px-4 text-left text-base font-semibold', selected ? 'bg-mist text-forest' : 'text-slate-brand hover:bg-mist/70')}
                >
                  {LOCALE_NAMES[locale]}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
