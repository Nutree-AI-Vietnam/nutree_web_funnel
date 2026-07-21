'use client';

import { useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { trackStepViewed } from '@/lib/analytics/track';
import { vi } from '@/lib/copy/vi';
import { QUIZ_STEPS, prevRoute, stepIndex, type QuizStep } from '@/lib/quiz/steps';
import { useHydrated } from '@/lib/quiz/store';

export function QuizShell({ step, children }: { step: QuizStep; children: React.ReactNode }) {
  const router = useRouter();
  const hydrated = useHydrated();

  useEffect(() => {
    trackStepViewed(step);
  }, [step]);

  if (!hydrated) return null;

  const currentStep = stepIndex(step);
  const progress = (currentStep / QUIZ_STEPS.length) * 100;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-5 pb-8 pt-4 sm:pt-6">
      <div className="mb-5 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => router.push(prevRoute(step))}
          aria-label={vi.common.back}
          className="min-h-11 min-w-11 rounded-full text-lg font-bold text-slate-brand transition hover:bg-mist focus:outline-none focus:ring-4 focus:ring-teal-brand/15"
        >
          ←
        </button>
        <Image
          src="/nutree-logo.png"
          alt="Nutree"
          width={104}
          height={40}
          priority
          className="h-10 w-[104px] object-contain"
        />
        <div className="min-w-[68px] text-right text-xs font-semibold text-muted-brand">
          {vi.common.stepCount(currentStep, QUIZ_STEPS.length)}
        </div>
      </div>
      <div
        role="progressbar"
        aria-label={vi.common.progress}
        aria-valuemin={1}
        aria-valuemax={QUIZ_STEPS.length}
        aria-valuenow={currentStep}
        className="mb-6 h-2 overflow-hidden rounded-full bg-border-brand"
      >
        <div
          className="h-full rounded-full bg-teal-brand transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div key={step} className="flex flex-1 flex-col animate-soft-enter">
        {children}
      </div>
    </main>
  );
}
