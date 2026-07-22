'use client';

import { useRouter } from 'next/navigation';
import { PrimaryButton } from '@/components/primary-button';
import { useCopy } from '@/lib/copy/use-copy';
import { useQuizStore } from '@/lib/quiz/store';

export function ResultPromisingStep() {
  const vi = useCopy();
  const router = useRouter();
  const name = useQuizStore((s) => s.data.name);

  return (
    <div className="flex flex-1 flex-col gap-2.5">
      <div className="rounded-[1.7rem] border border-white/80 bg-white/78 p-3.5 shadow-[0_20px_64px_rgb(26_71_57_/_0.12)] backdrop-blur">
        <p className="mb-1 text-sm font-bold text-emerald-brand">{vi.result_promising.eyebrow}</p>
        <h1 className="text-[1.45rem] font-extrabold leading-tight text-forest">
          {vi.result_promising.headline.replace('[name]', name || vi.reflection.fallbackName)}
        </h1>
        <p className="mt-1.5 text-xs leading-relaxed text-slate-brand">{vi.result_promising.body}</p>
      </div>

      <section className="surface-grain relative overflow-hidden rounded-[1.7rem] bg-white/86 p-3.5 text-forest shadow-[0_24px_70px_rgb(26_71_57_/_0.13),inset_0_1px_0_rgb(255_255_255_/_0.82)] backdrop-blur">
        <div className="absolute -right-10 -top-12 h-36 w-36 rounded-full bg-teal-brand/18 blur-2xl" />
        <div className="relative mb-2 flex items-center justify-between gap-3">
          <div>
            <div className="text-xs font-bold text-teal-brand">{vi.result_promising.withNutree}</div>
            <div className="text-lg font-extrabold">{vi.result_promising.withNutreeValue}</div>
          </div>
          <div className="rounded-full bg-mist px-3 py-1 text-xs font-bold text-muted-brand">
            {vi.result_promising.withoutNutree}
          </div>
        </div>
        <svg viewBox="0 0 320 132" className="relative h-[106px] w-full" role="img" aria-label={vi.result_promising.chartLabel}>
          <defs>
            <linearGradient id="promise-fill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#29b6a1" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#29b6a1" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d="M18 112h284" stroke="#d4e5de" strokeWidth="2" strokeLinecap="round" />
          <path d="M18 24v88" stroke="#d4e5de" strokeWidth="2" strokeLinecap="round" />
          <path
            className="promise-line-muted"
            d="M20 104 C 88 96, 164 92, 300 84"
            fill="none"
            stroke="#8aa199"
            strokeWidth="4"
            strokeDasharray="7 7"
            strokeLinecap="round"
          />
          <path
            d="M20 110 C 94 101, 154 78, 214 45 C 250 26, 278 20, 302 18 L302 112 L20 112 Z"
            fill="url(#promise-fill)"
          />
          <path
            className="promise-line"
            d="M20 110 C 94 101, 154 78, 214 45 C 250 26, 278 20, 302 18"
            fill="none"
            stroke="#29b6a1"
            strokeWidth="5"
            strokeLinecap="round"
          />
          <circle className="promise-dot" cx="302" cy="18" r="8" fill="#29b6a1" />
          <circle cx="20" cy="110" r="4" fill="#29b6a1" />
        </svg>
      </section>

      <section className="rounded-2xl border border-white/75 bg-white/86 p-3.5 shadow-sm backdrop-blur">
        <h2 className="text-base font-extrabold text-forest">{vi.result_promising.nextTitle}</h2>
        <div className="mt-2 grid gap-1.5">
          {vi.result_promising.nextItems.map((item, index) => (
            <div key={item} className="grid grid-cols-[1.75rem_1fr_auto] items-center gap-2 rounded-2xl bg-bg-brand px-3 py-1.5 text-[0.7rem] font-semibold text-slate-brand">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-xs font-extrabold text-forest shadow-sm">
                {index + 1}
              </span>
              <span>{item}</span>
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal-brand text-xs text-white">
                ✓
              </span>
            </div>
          ))}
        </div>
      </section>

      <div className="mt-auto pt-1">
        <PrimaryButton onClick={() => router.push('/email')}>
          {vi.result_promising.cta}
        </PrimaryButton>
      </div>
    </div>
  );
}
