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
      <h1 className="text-2xl font-bold text-forest">
        {vi.result_promising.headline.replace('[name]', name || vi.reflection.fallbackName)}
      </h1>
      <p className="text-slate-brand">{vi.result_promising.body}</p>

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

      <div className="mt-auto pt-4">
        <PrimaryButton onClick={() => router.push(nextRoute('result_promising'))}>
          {vi.result_promising.cta}
        </PrimaryButton>
      </div>
    </div>
  );
}
