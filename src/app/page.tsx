'use client';

import { useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { BackgroundBeams } from '@/components/ui/background-beams';
import { TasteMotionRoot, TasteWords } from '@/components/ui/gsap-taste';
import { MovingBorderLink } from '@/components/ui/moving-border-button';
import { trackStepViewed } from '@/lib/analytics/track';
import { vi } from '@/lib/copy/vi';

function PlanPreview() {
  const macroItems = [
    { label: 'Protein', value: '132g', width: 82, tone: 'bg-protein' },
    { label: 'Carbs', value: '127g', width: 66, tone: 'bg-carbs' },
    { label: 'Chất béo', value: '48g', width: 46, tone: 'bg-fat' },
  ];
  const meals = [
    { label: 'Sáng', calories: 420, note: 'protein cao' },
    { label: 'Trưa', calories: 560, note: 'đủ năng lượng' },
    { label: 'Tối', calories: 490, note: 'nhẹ bụng' },
  ];

  return (
    <section id="plan-preview" className="taste-stack relative w-full overflow-hidden rounded-[2rem] border border-white/80 bg-white/88 p-4 shadow-[0_26px_80px_rgb(26_71_57_/_0.14)] backdrop-blur md:grid md:grid-flow-dense md:grid-cols-4 md:gap-3">
      <div className="taste-stack-card relative flex items-start justify-between gap-4 md:col-span-2 md:row-span-1">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-teal-brand">
            {vi.landing.planTitle}
          </p>
          <h2 className="mt-1 text-xl font-extrabold leading-tight text-forest">
            1.470 calo / ngày
          </h2>
          <p className="mt-1 text-sm font-semibold text-muted-brand">{vi.landing.planSubtitle}</p>
        </div>
        <div className="hidden h-20 w-20 shrink-0 place-items-center rounded-2xl bg-forest text-center text-xs font-extrabold leading-tight text-white shadow-sm sm:grid">
          Kế hoạch
        </div>
      </div>

      <div className="taste-stack-card relative mt-4 rounded-2xl bg-bg-brand p-3 md:col-span-2 md:row-span-1 md:mt-0">
        <div className="space-y-2">
          {macroItems.map((item) => (
            <div key={item.label}>
              <div className="mb-1 flex items-center justify-between text-xs font-bold text-slate-brand">
                <span>{item.label}</span>
                <span>{item.value}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-mist">
                <div className={`h-full rounded-full ${item.tone}`} style={{ width: `${item.width}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="taste-stack-card group relative mt-3 flex gap-2 md:col-span-4 md:row-span-1 md:mt-0">
        {meals.map((meal) => (
          <div key={meal.label} className="min-w-0 flex-1 overflow-hidden rounded-2xl bg-white px-3 py-2 shadow-sm transition-all duration-700 ease-out hover:flex-[1.35]">
            <div className="text-xs font-extrabold text-teal-brand">{meal.label}</div>
            <div className="mt-1 text-sm font-extrabold text-forest">
              {meal.calories}
            </div>
            <div className="truncate text-[0.65rem] font-bold text-muted-brand">{meal.note}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function SignalMarquee() {
  const signals = ['TDEE', 'BMI', 'Protein', 'Carbs', 'Fat', 'Bữa ăn', 'Cân nặng'];
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
  useEffect(() => trackStepViewed('landing'), []);

  return (
    <main className="relative mx-auto min-h-dvh w-full max-w-full overflow-x-hidden">
      <BackgroundBeams />
      <TasteMotionRoot className="relative z-10 mx-auto flex min-h-dvh w-full max-w-lg flex-col px-5 pb-4 pt-5 md:max-w-6xl md:px-8 md:py-8">
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
            <span className="rounded-full border border-white/70 bg-white/75 px-3 py-1 text-xs font-bold text-emerald-deep shadow-sm backdrop-blur">
              {vi.landing.language}
            </span>
          </div>
        </nav>

        <section className="flex flex-1 flex-col justify-center gap-4 pt-5 md:grid md:grid-cols-[minmax(0,0.86fr)_minmax(0,1.14fr)] md:items-center md:gap-8 md:pt-12">
          <div className="taste-hero-copy min-w-0">
            <h1 className="max-w-[22rem] text-[clamp(2.35rem,7vw,4.25rem)] font-extrabold leading-[1.02] text-forest md:max-w-[40rem]">
              {vi.landing.headline}
            </h1>
            <p className="mt-3 max-w-[29rem] text-base font-semibold leading-relaxed text-slate-brand md:text-lg">
              <TasteWords text={vi.landing.subheadline} />
            </p>
            <div className="mt-5">
              <MovingBorderLink href="/quiz/goal">
                {vi.landing.cta}
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
          <p className="text-center text-xs leading-relaxed text-muted-brand">{vi.landing.legal}</p>
        </footer>
      </TasteMotionRoot>
    </main>
  );
}
