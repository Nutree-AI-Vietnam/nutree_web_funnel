'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Slideshow } from '@/components/slideshow';
import { trackStepViewed } from '@/lib/analytics/track';
import { vi } from '@/lib/copy/vi';

export default function LandingPage() {
  useEffect(() => trackStepViewed('landing'), []);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col justify-center gap-6 px-5 py-8">
      <div className="text-2xl font-extrabold text-wordmark">Nutree</div>
      <h1 className="text-4xl font-extrabold leading-tight text-forest">{vi.landing.headline}</h1>
      <p className="text-lg text-slate-brand">{vi.landing.subheadline}</p>
      <Slideshow slides={vi.landing.slides} />
      <ul className="flex flex-col gap-3">
        {vi.landing.bullets.map((b) => (
          <li key={b} className="flex items-center gap-3 text-charcoal">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-mist text-sm text-emerald-brand">
              ✓
            </span>
            {b}
          </li>
        ))}
      </ul>
      <Link
        href="/quiz/name_ask"
        className="rounded-2xl bg-teal-brand px-6 py-4 text-center text-lg font-semibold text-white shadow-sm transition hover:bg-emerald-brand active:scale-[0.99]"
      >
        {vi.landing.cta}
      </Link>
    </main>
  );
}
