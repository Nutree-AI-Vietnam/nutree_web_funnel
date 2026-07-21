'use client';

import { useEffect } from 'react';
import Image from 'next/image';
import { BackgroundBeams } from '@/components/ui/background-beams';
import { MovingBorderLink } from '@/components/ui/moving-border-button';
import { trackStepViewed } from '@/lib/analytics/track';
import { vi } from '@/lib/copy/vi';

function PlanPreview() {
  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-white/80 bg-white/88 p-4 shadow-[0_26px_80px_rgb(26_71_57_/_0.14)] backdrop-blur">
      <div className="absolute -right-14 -top-14 h-36 w-36 rounded-full bg-teal-brand/15 blur-2xl" />
      <div className="relative flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-teal-brand">
            {vi.landing.planTitle}
          </p>
          <h2 className="mt-1 text-xl font-extrabold leading-tight text-forest">
            1.470 calo / ngày
          </h2>
          <p className="mt-1 text-sm font-semibold text-muted-brand">{vi.landing.planSubtitle}</p>
        </div>
        <div className="grid h-20 w-20 shrink-0 place-items-center rounded-full p-2 shadow-inner [background:conic-gradient(#29b6a1_0_72%,#e8f2ee_72%_100%)]">
          <div className="grid h-full w-full place-items-center rounded-full bg-white text-center">
            <span className="text-xs font-extrabold leading-tight text-forest">
              72%
              <br />
              khớp
            </span>
          </div>
        </div>
      </div>

      <div className="relative mt-4 rounded-2xl bg-bg-brand p-3">
        <div className="space-y-2">
          {[
            { label: 'Protein', value: '132g', width: 82, tone: 'bg-protein' },
            { label: 'Carbs', value: '127g', width: 66, tone: 'bg-carbs' },
            { label: 'Chất béo', value: '48g', width: 46, tone: 'bg-fat' },
          ].map((item) => (
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

      <div className="relative mt-3 grid grid-cols-3 gap-2">
        {['Sáng', 'Trưa', 'Tối'].map((meal, index) => (
          <div key={meal} className="rounded-2xl bg-white px-3 py-2 shadow-sm">
            <div className="text-xs font-extrabold text-teal-brand">{meal}</div>
            <div className="mt-1 text-sm font-extrabold text-forest">
              {[420, 560, 490][index]}
            </div>
            <div className="text-[0.65rem] font-bold text-muted-brand">calo</div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function LandingPage() {
  useEffect(() => trackStepViewed('landing'), []);

  return (
    <main className="relative mx-auto flex min-h-dvh w-full max-w-lg flex-col overflow-hidden px-5 pb-4 pt-5">
      <BackgroundBeams />
      <div className="relative z-10 flex items-center justify-between">
        <Image
          src="/nutree-logo-simple.png"
          alt="Nutree"
          width={72}
          height={64}
          priority
          className="h-12 w-12 object-contain"
        />
        <span className="rounded-full border border-white/70 bg-white/75 px-3 py-1 text-xs font-bold text-emerald-deep shadow-sm backdrop-blur">
          {vi.landing.language}
        </span>
      </div>

      <section className="relative z-10 flex flex-1 flex-col justify-center gap-4 pt-5">
        <div>
          <h1 className="text-[2.45rem] font-extrabold leading-[1.03] text-forest">
            {vi.landing.headline}
          </h1>
          <p className="mt-3 max-w-[27rem] text-base font-semibold leading-relaxed text-slate-brand">
            {vi.landing.subheadline}
          </p>
        </div>

        <PlanPreview />

        <div className="mt-auto flex flex-col gap-3">
          <MovingBorderLink href="/quiz/name_ask">
            {vi.landing.cta}
          </MovingBorderLink>
          <p className="text-center text-xs leading-relaxed text-muted-brand">{vi.landing.legal}</p>
        </div>
      </section>
    </main>
  );
}
