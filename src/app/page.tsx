'use client';

import { useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { trackStepViewed } from '@/lib/analytics/track';
import { vi } from '@/lib/copy/vi';

export default function LandingPage() {
  useEffect(() => trackStepViewed('landing'), []);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col gap-5 overflow-hidden px-5 pb-8 pt-6">
      <div className="flex items-center justify-between">
        <Image
          src="/nutree-logo.png"
          alt="Nutree"
          width={156}
          height={60}
          priority
          className="h-[42px] w-[110px] object-contain"
        />
        <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-emerald-deep shadow-sm">
          {vi.landing.language}
        </span>
      </div>

      <section className="relative flex flex-1 flex-col justify-center gap-5">
        <div aria-hidden="true" className="absolute -right-3 top-0 text-[7.5rem] font-extrabold leading-none text-mist/80">
          01
        </div>
        <div className="relative">
          <p className="mb-3 text-sm font-bold text-emerald-brand">{vi.landing.eyebrow}</p>
          <h1 className="text-[2.6rem] font-extrabold leading-[1.05] text-forest">
            {vi.landing.headline}
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-slate-brand">{vi.landing.subheadline}</p>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {vi.landing.proofStats.map((stat) => (
            <div key={stat.value} className="rounded-2xl bg-white p-3 text-center shadow-sm">
              <div className="text-lg font-extrabold text-forest">{stat.value}</div>
              <div className="mt-1 text-[0.72rem] leading-snug text-muted-brand">{stat.label}</div>
            </div>
          ))}
        </div>

        <div className="rounded-3xl border border-border-brand bg-white/90 p-4 shadow-[0_18px_42px_rgb(26_71_57_/_0.08)]">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-mist text-xl">
              {vi.landing.planBadge}
            </div>
            <div>
              <div className="font-extrabold text-forest">{vi.landing.planTitle}</div>
              <div className="text-sm text-muted-brand">{vi.landing.planSubtitle}</div>
            </div>
          </div>
          <ul className="grid gap-2">
            {vi.landing.bullets.map((item) => (
              <li key={item} className="flex items-center gap-2 rounded-xl bg-bg-brand px-3 py-2 text-sm font-semibold text-slate-brand">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-teal-brand text-xs text-white">
                  ✓
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-auto flex flex-col gap-3">
          <Link
            href="/quiz/name_ask"
            className="min-h-12 rounded-2xl bg-teal-brand px-6 py-4 text-center text-lg font-semibold text-white shadow-sm transition hover:bg-emerald-brand focus:outline-none focus:ring-4 focus:ring-teal-brand/20 active:scale-[0.99]"
          >
            {vi.landing.cta}
          </Link>
          <p className="text-center text-xs leading-relaxed text-muted-brand">{vi.landing.legal}</p>
        </div>
      </section>
    </main>
  );
}
