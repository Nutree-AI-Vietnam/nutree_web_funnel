'use client';

import { useRouter } from 'next/navigation';
import { PrimaryButton } from '@/components/primary-button';
import { vi } from '@/lib/copy/vi';
import { nextRoute } from '@/lib/quiz/steps';
import { useQuizStore } from '@/lib/quiz/store';

export function ResultPromisingStep() {
  const router = useRouter();
  const name = useQuizStore((s) => s.data.name);

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div>
        <p className="mb-2 text-sm font-bold text-emerald-brand">{vi.result_promising.eyebrow}</p>
        <h1 className="text-2xl font-extrabold leading-tight text-forest">
          {vi.result_promising.headline.replace('[name]', name || vi.reflection.fallbackName)}
        </h1>
        <p className="mt-3 text-slate-brand">{vi.result_promising.body}</p>
      </div>

      <svg viewBox="0 0 320 200" className="w-full rounded-2xl bg-white p-2 shadow-sm" role="img">
        <line x1="30" y1="170" x2="300" y2="170" stroke="#d4e5de" strokeWidth="2" />
        <line x1="30" y1="20" x2="30" y2="170" stroke="#d4e5de" strokeWidth="2" />
        <path
          d="M30 160 C 110 150, 190 145, 300 140"
          fill="none"
          stroke="#9ba8a3"
          strokeWidth="3"
          strokeDasharray="6 5"
        />
        <path
          d="M30 160 C 120 140, 180 90, 300 40"
          fill="none"
          stroke="#29b6a1"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <circle cx="300" cy="40" r="6" fill="#29b6a1" />
        <text x="200" y="30" fontSize="12" fill="#1a4739" fontWeight="700">
          {vi.result_promising.withNutree}
        </text>
        <text x="210" y="130" fontSize="12" fill="#6b7b75">
          {vi.result_promising.withoutNutree}
        </text>
      </svg>

      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="text-base font-extrabold text-forest">{vi.result_promising.nextTitle}</h2>
        <div className="mt-3 grid gap-2">
          {vi.result_promising.nextItems.map((item) => (
            <div key={item} className="flex items-center gap-3 rounded-xl bg-bg-brand px-3 py-2 text-sm font-semibold text-slate-brand">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-mist text-xs text-emerald-deep">
                ✓
              </span>
              {item}
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-base font-extrabold text-forest">{vi.result_promising.proofTitle}</h2>
        <div className="grid gap-3">
          {vi.result_promising.proofCards.map((card) => (
            <div key={card.title} className="rounded-2xl bg-white p-4 shadow-sm">
              <div className="text-sm font-extrabold text-forest">{card.title}</div>
              <p className="mt-2 text-sm font-medium leading-relaxed text-slate-brand">{card.body}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="mt-auto pt-4">
        <PrimaryButton onClick={() => router.push(nextRoute('result_promising'))}>
          {vi.result_promising.cta}
        </PrimaryButton>
      </div>
    </div>
  );
}
