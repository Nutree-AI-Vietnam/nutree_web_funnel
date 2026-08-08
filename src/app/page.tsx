'use client';

import { useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { BackgroundBeams } from '@/components/ui/background-beams';
import { TasteMotionRoot, TasteWords } from '@/components/ui/gsap-taste';
import { MovingBorderLink } from '@/components/ui/moving-border-button';
import { trackStepViewed } from '@/lib/analytics/track';
import { LOCALE_LABELS, LOCALE_NAMES, LOCALE_ORDER } from '@/lib/copy';
import { useCopy, useLocale, useSetLocale } from '@/lib/copy/use-copy';
import { useQuizStore } from '@/lib/quiz/store';
import { cn } from '@/lib/utils';

const MACRO_BARS = [
  { width: 82, tone: 'bg-protein' },
  { width: 66, tone: 'bg-carbs' },
  { width: 46, tone: 'bg-fat' },
];

function LanguageToggle() {
  const active = useLocale();
  const setLocale = useSetLocale();

  return (
    <div
      role="group"
      aria-label="Language / Ngôn ngữ"
      className="flex items-center gap-0.5 rounded-full border border-white/70 bg-white/70 p-0.5 shadow-[inset_0_0_0_1px_rgb(255_255_255_/_0.5),0_2px_8px_rgb(16_39_32_/_0.05)] backdrop-blur"
    >
      {LOCALE_ORDER.map((locale) => {
        const selected = locale === active;
        return (
          <button
            key={locale}
            type="button"
            onClick={() => setLocale(locale)}
            aria-pressed={selected}
            aria-label={LOCALE_NAMES[locale]}
            className={cn(
              'grid min-h-11 min-w-11 place-items-center rounded-full px-3 text-xs font-bold tracking-wide transition focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-brand focus-visible:ring-offset-1',
              selected
                ? 'bg-[linear-gradient(135deg,#1c5546,#0f2c23)] text-white shadow-sm'
                : 'text-emerald-deep hover:bg-white/70',
            )}
          >
            {LOCALE_LABELS[locale]}
          </button>
        );
      })}
    </div>
  );
}

function PlanPreview() {
  const copy = useCopy();
  const macroItems = copy.landing.planMacros.map((item, i) => ({ ...item, ...MACRO_BARS[i] }));
  const meals = copy.landing.planMeals;

  return (
    <section id="plan-preview" className="taste-stack relative w-full overflow-hidden rounded-[2rem] border border-white/80 bg-white/90 p-5 shadow-[0_26px_80px_rgb(26_71_57_/_0.14)] backdrop-blur md:grid md:grid-flow-dense md:grid-cols-4 md:gap-4 md:p-6">
      <div className="taste-stack-card relative md:col-span-2 md:row-span-1">
        <p className="text-[0.7rem] font-extrabold uppercase tracking-[0.16em] text-teal-brand">
          {copy.landing.planTitle}
        </p>
        <h2 className="mt-2 flex items-baseline gap-1.5 text-[1.7rem] font-extrabold leading-none tracking-tight text-forest">
          {copy.landing.planCalories}
          <span className="text-sm font-bold text-muted-brand">{copy.landing.planCaloriesUnit}</span>
        </h2>
        <p className="mt-2.5 text-sm font-semibold leading-relaxed text-muted-brand">{copy.landing.planSubtitle}</p>
      </div>

      <div className="taste-stack-card relative mt-5 rounded-2xl bg-bg-brand p-4 md:col-span-2 md:row-span-1 md:mt-0">
        <div className="space-y-3.5">
          {macroItems.map((item) => (
            <div key={item.label}>
              <div className="mb-1.5 flex items-center justify-between text-xs font-bold">
                <span className="flex items-center gap-2 text-slate-brand">
                  <span className={`h-2 w-2 shrink-0 rounded-full ${item.tone}`} aria-hidden="true" />
                  {item.label}
                </span>
                <span className="tabular-nums text-forest">{item.value}</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-mist">
                <div className={`h-full rounded-full ${item.tone}`} style={{ width: `${item.width}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="taste-stack-card relative mt-6 grid grid-cols-3 gap-2.5 md:col-span-4 md:row-span-1 md:mt-2">
        {meals.map((meal) => (
          <div
            key={meal.label}
            className="rounded-2xl bg-white px-3.5 py-4 shadow-[inset_0_0_0_1px_rgb(26_71_57_/_0.05),0_6px_18px_rgb(26_71_57_/_0.06)] transition-transform duration-300 ease-out hover:-translate-y-0.5"
          >
            <div className="text-[0.68rem] font-extrabold uppercase tracking-wide text-teal-brand">{meal.label}</div>
            <div className="mt-2.5 flex items-baseline gap-1">
              <span className="text-xl font-extrabold leading-none tabular-nums text-forest">{meal.calories}</span>
              <span className="text-[0.6rem] font-bold text-muted-brand">kcal</span>
            </div>
            <div className="mt-1.5 text-[0.7rem] font-semibold leading-tight text-muted-brand">{meal.note}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function SignalMarquee() {
  const signals = useCopy().landing.signals;
  return (
    <div className="relative overflow-hidden py-1">
      <div className="flex w-max animate-[marquee_18s_linear_infinite] gap-2">
        {[...signals, ...signals].map((item, index) => (
          <span key={`${item}-${index}`} className="rounded-full border border-white/70 bg-white/70 px-3 py-1 text-[0.68rem] font-extrabold text-slate-brand shadow-sm backdrop-blur">
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function LandingPage() {
  const copy = useCopy();
  const resetQuiz = useQuizStore((state) => state.reset);
  useEffect(() => trackStepViewed('landing'), []);

  return (
    <main className="relative mx-auto min-h-dvh w-full max-w-full overflow-x-hidden">
      <BackgroundBeams />
      <TasteMotionRoot className="relative z-10 mx-auto flex min-h-dvh w-full max-w-lg flex-col px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1.25rem,env(safe-area-inset-top))] md:max-w-6xl md:px-8 md:py-8">
        <nav className="flex items-center justify-between">
          <Link href="/" aria-label="Nutree" className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/60 bg-white/55 shadow-sm backdrop-blur">
            <Image
              src="/nutree-logo-simple.png"
              alt=""
              width={72}
              height={64}
              priority
              className="h-9 w-9 object-contain"
            />
          </Link>
          <div className="flex items-center gap-2">
            <LanguageToggle />
          </div>
        </nav>

        <section className="flex flex-1 flex-col justify-center gap-4 pt-5 md:grid md:grid-cols-[minmax(0,0.86fr)_minmax(0,1.14fr)] md:items-center md:gap-8 md:pt-12">
          <div className="taste-hero-copy min-w-0">
            <h1 className="max-w-[22rem] text-[clamp(2.35rem,7vw,4.25rem)] font-extrabold leading-[1.02] text-forest md:max-w-[40rem]">
              {copy.landing.headline}
            </h1>
            <p className="mt-3 max-w-[29rem] text-base font-semibold leading-relaxed text-slate-brand md:text-lg">
              <TasteWords text={copy.landing.subheadline} />
            </p>
            <div className="mt-5">
              <MovingBorderLink
                href="/quiz/goal"
                onClick={() => {
                  resetQuiz();
                  window.sessionStorage.removeItem('quiz:lastIndex');
                }}
              >
                {copy.landing.cta}
              </MovingBorderLink>
            </div>
          </div>

          <div className="min-w-0 md:pt-10">
            <PlanPreview />
            <div className="mt-3 hidden sm:block">
              <SignalMarquee />
            </div>
          </div>
        </section>

        <footer className="mt-auto pt-3">
          <p className="text-center text-xs leading-relaxed text-muted-brand">
            {copy.landing.legal.prefix}
            <a
              href={copy.landing.legal.termsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-forest underline decoration-forest/30 underline-offset-2 transition hover:decoration-forest"
            >
              {copy.landing.legal.terms}
            </a>
            {copy.landing.legal.connector}
            <a
              href={copy.landing.legal.privacyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-forest underline decoration-forest/30 underline-offset-2 transition hover:decoration-forest"
            >
              {copy.landing.legal.privacy}
            </a>
            {copy.landing.legal.suffix}
          </p>
        </footer>
      </TasteMotionRoot>
    </main>
  );
}
