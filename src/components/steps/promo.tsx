'use client';

import { useRouter } from 'next/navigation';
import { PrimaryButton } from '@/components/primary-button';
import { vi } from '@/lib/copy/vi';
import { nextRoute, type QuizStep } from '@/lib/quiz/steps';

export function PromoStep({
  step,
  headline,
  body,
  emoji,
  section,
  kicker,
  proof = [],
}: {
  step: QuizStep;
  headline: string;
  body: string;
  emoji: string;
  section?: string;
  kicker?: string;
  proof?: readonly string[];
}) {
  const router = useRouter();
  return (
    <div className="relative flex flex-1 flex-col justify-center gap-6 overflow-hidden">
      {section && (
        <div aria-hidden="true" className="absolute right-0 top-0 text-[8rem] font-extrabold leading-none text-mist/80">
          {section}
        </div>
      )}
      <div className="relative h-1 w-16 rounded-full bg-teal-brand" />
      <div className="relative">
        <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-brand text-2xl text-white shadow-sm animate-subtle-pulse">
          {emoji}
        </div>
        {kicker && <p className="mb-2 text-sm font-bold text-emerald-brand">{kicker}</p>}
        <h1 className="text-3xl font-extrabold leading-tight text-forest">{headline}</h1>
        <p className="mt-3 text-base leading-relaxed text-slate-brand">{body}</p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {proof.map((item) => (
          <div key={item} className="rounded-2xl bg-white p-3 text-center text-sm font-bold text-slate-brand shadow-sm">
            {item}
          </div>
        ))}
      </div>

      <div className="mt-auto pt-4">
        <PrimaryButton onClick={() => router.push(nextRoute(step))}>{vi.common.continue}</PrimaryButton>
      </div>
    </div>
  );
}
