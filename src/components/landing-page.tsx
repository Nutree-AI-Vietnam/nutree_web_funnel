'use client';

import Link from 'next/link';
import { NutreeLogo } from '@/components/nutree-logo';
import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { BoCongThuongBadge } from '@/components/bo-cong-thuong-badge';
import { BackgroundBeams } from '@/components/ui/background-beams';
import { MovingBorderLink } from '@/components/ui/moving-border-button';
import { trackStepViewed } from '@/lib/analytics/track';
import { copyFor, LOCALE_NAMES, LOCALE_ORDER, type Copy, type Locale } from '@/lib/copy';
import { useQuizStore } from '@/lib/quiz/store';
import { cn } from '@/lib/utils';

const MACRO_BARS = [
  { width: 82, tone: 'bg-protein' },
  { width: 66, tone: 'bg-carbs' },
  { width: 46, tone: 'bg-fat' },
];

const LOCALE_FLAGS: Record<Locale, string> = { vi: '🇻🇳', en: '🇺🇸' };

function useViewportFit(frameRef: RefObject<HTMLElement | null>, contentRef: RefObject<HTMLElement | null>, key: string) {
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const frame = frameRef.current;
    const content = contentRef.current;
    if (!frame || !content) return;

    const fit = () => {
      const available = frame.clientHeight;
      const needed = content.scrollHeight;
      const next = available > 0 && needed > available + 1 ? Math.max(0.62, available / needed) : 1;
      setScale((current) => (Math.abs(current - next) < 0.008 ? current : Number(next.toFixed(3))));
    };

    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(frame);
    observer.observe(content);
    return () => observer.disconnect();
  }, [frameRef, contentRef, key]);

  return scale;
}

function LanguageMenu({ active, onChange }: { active: Locale; onChange?: (locale: Locale) => void }) {
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
        <span aria-hidden="true" className="text-lg leading-none">{LOCALE_FLAGS[active]}</span>
        <svg viewBox="0 0 24 24" className={cn('size-4 transition-transform duration-200', open && 'rotate-180')} aria-hidden="true">
          <path d="M5.5 9.25 12 15.75 18.5 9.25" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <ul role="listbox" aria-label="Language / Ngôn ngữ" className="absolute right-0 z-30 mt-2 w-56 overflow-hidden rounded-2xl border border-white/80 bg-white py-1 shadow-[0_18px_40px_rgb(16_39_32_/_0.16)]">
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
                  <span aria-hidden="true" className="text-xl leading-none">{LOCALE_FLAGS[locale]}</span>
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

function PlanPreview({ copy }: { copy: Copy }) {
  const macroItems = copy.landing.planMacros.map((item, i) => ({ ...item, ...MACRO_BARS[i] }));
  return (
    <section id="plan-preview" className="taste-stack relative w-full overflow-hidden rounded-[1.35rem] border border-white/80 bg-white/90 p-[clamp(10px,1.5vh,22px)] shadow-[0_18px_48px_rgb(26_71_57_/_0.12)] backdrop-blur md:grid md:grid-flow-dense md:grid-cols-4 md:gap-[clamp(8px,1.4vh,16px)] md:rounded-[1.7rem] md:shadow-[0_26px_80px_rgb(26_71_57_/_0.14)]">
      <div className="taste-stack-card relative md:col-span-2 md:row-span-1">
        <p className="text-[clamp(12px,1.45vh,14px)] font-extrabold tracking-[0.02em] text-teal-brand">{copy.landing.planTitle}</p>
        <h2 className="mt-0.5 flex items-baseline gap-1.5 text-[clamp(20px,2.7vh,28px)] font-extrabold leading-none tracking-tight text-forest">
          {copy.landing.planCalories}
          <span className="text-[clamp(11px,1.3vh,14px)] font-bold text-muted-brand">{copy.landing.planCaloriesUnit}</span>
        </h2>
        <p className="mt-1 text-[clamp(11px,1.35vh,14px)] font-semibold leading-snug text-muted-brand">{copy.landing.planSubtitle}</p>
      </div>
      <div className="taste-stack-card relative mt-[clamp(8px,1.1vh,12px)] rounded-2xl bg-bg-brand p-[clamp(8px,1.1vh,14px)] md:col-span-2 md:row-span-1 md:mt-0">
        <div className="space-y-[clamp(4px,0.7vh,10px)]">
          {macroItems.map((item) => (
            <div key={item.label}>
              <div className="mb-0.5 flex items-center justify-between text-[clamp(11px,1.3vh,13px)] font-bold">
                <span className="flex items-center gap-1.5 text-slate-brand">
                  <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${item.tone}`} aria-hidden="true" />
                  {item.label}
                </span>
                <span className="tabular-nums text-forest">{item.value}</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-mist md:h-2">
                <div className={`h-full rounded-full ${item.tone}`} style={{ width: `${item.width}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="taste-stack-card relative mt-[clamp(8px,1.1vh,12px)] grid grid-cols-3 gap-1.5 md:col-span-4 md:row-span-1 md:mt-0 md:gap-2">
        {copy.landing.planMeals.map((meal) => (
          <div key={meal.label} className="rounded-xl bg-white px-2 py-[clamp(6px,0.9vh,12px)] shadow-[inset_0_0_0_1px_rgb(26_71_57_/_0.05),0_4px_12px_rgb(26_71_57_/_0.05)] md:rounded-2xl md:px-3">
            <div className="text-[clamp(12px,1.4vh,14px)] font-extrabold tracking-[0.02em] text-teal-brand">{meal.label}</div>
            <div className="mt-0.5 line-clamp-2 text-[clamp(13px,1.55vh,15px)] font-extrabold leading-tight text-forest">{meal.dish}</div>
            <div className="mt-0.5 text-[clamp(10px,1.2vh,12px)] font-semibold leading-tight text-muted-brand">{meal.note}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function SignalMarquee({ signals }: { signals: Copy['landing']['signals'] }) {
  return (
    <div className="relative overflow-hidden py-[clamp(2px,0.4vh,6px)]">
      <ul className="flex w-max animate-[marquee_18s_linear_infinite] gap-1.5 motion-reduce:animate-none">
        {[...signals, ...signals].map((item, index) => (
          <li key={`${item}-${index}`} className="rounded-full border border-white/80 bg-white/90 px-2.5 py-1 text-[clamp(11px,1.35vh,13px)] font-bold text-slate-brand shadow-sm">{item}</li>
        ))}
      </ul>
    </div>
  );
}

export function LandingPage({ language, surveyPath, onStart, onLocaleChange }: { language: Locale; surveyPath: string; onStart: () => void; onLocaleChange?: (locale: Locale) => void }) {
  const copy = copyFor(language);
  const resetQuiz = useQuizStore((state) => state.reset);
  const frameRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const scale = useViewportFit(frameRef, contentRef, language);
  useEffect(() => trackStepViewed('landing'), []);
  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <main ref={frameRef} className="relative flex h-dvh w-full flex-col overflow-hidden">
      <BackgroundBeams />
      <div
        ref={contentRef}
        className="relative z-10 mx-auto flex min-h-full w-full max-w-lg flex-col px-4 pb-[max(0.35rem,env(safe-area-inset-bottom))] pt-[max(0.35rem,env(safe-area-inset-top))] md:max-w-6xl md:justify-center md:px-8"
        style={scale < 0.995 ? { transform: `scale(${scale})`, transformOrigin: 'top center' } : undefined}
      >
        <nav className="flex shrink-0 items-center justify-between">
          <Link href={`/survey/${language}`} aria-label="Nutree" className="block h-11 w-11"><NutreeLogo priority className="h-11 w-11 shadow-sm" /></Link>
          <LanguageMenu active={language} onChange={onLocaleChange} />
        </nav>
        <div className="min-h-3 flex-1 md:min-h-6 md:flex-none" aria-hidden="true" />
        <section className="grid gap-[clamp(16px,2.6vh,36px)] md:grid-cols-[minmax(0,0.86fr)_minmax(0,1.14fr)] md:items-center">
          <div className="min-w-0">
            <h1 className="max-w-[36rem] text-[clamp(18px,2.65vh,34px)] font-extrabold leading-[1.14] text-forest">{copy.landing.headline}</h1>
            <p className="mt-[clamp(12px,1.6vh,18px)] max-w-[29rem] text-[clamp(13px,1.55vh,17px)] font-semibold leading-snug text-slate-brand">{copy.landing.subheadline}</p>
            <div className="mt-[clamp(16px,2.2vh,28px)]">
              <MovingBorderLink href={surveyPath} className="min-h-[clamp(44px,5.4vh,56px)] py-2 text-[clamp(15px,1.8vh,18px)]" onClick={() => { resetQuiz(); window.sessionStorage.removeItem('quiz:lastIndex'); onStart(); }}>{copy.landing.cta}</MovingBorderLink>
            </div>
          </div>
          <div className="min-w-0">
            <PlanPreview copy={copy} />
            <div className="mt-[clamp(14px,1.8vh,22px)]"><SignalMarquee signals={copy.landing.signals} /></div>
          </div>
        </section>
        <div className="min-h-3 flex-1 md:min-h-6 md:flex-none" aria-hidden="true" />
        <footer className="flex shrink-0 flex-col items-center gap-[clamp(6px,0.9vh,10px)]">
          <BoCongThuongBadge alt={copy.common.bctBadgeAlt} height={52} className="[&_img]:h-[clamp(28px,4.2vh,48px)] [&_img]:w-auto" />
          <p className="text-center text-[clamp(11px,1.35vh,14px)] leading-snug text-muted-brand">{copy.landing.legal.prefix}<a href={copy.landing.legal.termsUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-forest underline decoration-forest/30 underline-offset-2 transition hover:decoration-forest">{copy.landing.legal.terms}</a>{copy.landing.legal.connector}<a href={copy.landing.legal.privacyUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-forest underline decoration-forest/30 underline-offset-2 transition hover:decoration-forest">{copy.landing.legal.privacy}</a>{copy.landing.legal.suffix}</p>
        </footer>
      </div>
    </main>
  );
}
