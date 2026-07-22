'use client';

import { useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { BackgroundBeams } from '@/components/ui/background-beams';
import { trackStepViewed } from '@/lib/analytics/track';
import { vi } from '@/lib/copy/vi';
import { chapterLabel, QUIZ_STEPS, prevRoute, stepIndex, type QuizStep } from '@/lib/quiz/steps';
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
    <main className="relative mx-auto flex min-h-dvh w-full max-w-lg flex-col overflow-hidden px-5 pb-5 pt-3 sm:pt-5">
      <BackgroundBeams className="opacity-70" />
      <div className="relative z-10 mb-4 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => router.push(prevRoute(step))}
          aria-label={vi.common.back}
          className="min-h-11 min-w-11 rounded-full border border-white/70 bg-white/75 text-lg font-bold text-slate-brand shadow-sm backdrop-blur transition hover:bg-mist focus:outline-none focus:ring-4 focus:ring-teal-brand/15"
        >
          ←
        </button>
        <Image
          src="/nutree-logo-simple.png"
          alt="Nutree"
          width={72}
          height={64}
          priority
          className="h-10 w-10 object-contain"
        />
        <div aria-hidden="true" className="min-w-11" />
      </div>
      <div
        role="progressbar"
        aria-label={vi.common.progress}
        aria-valuemin={1}
        aria-valuemax={QUIZ_STEPS.length}
        aria-valuenow={currentStep}
        className="relative z-10 mb-3 h-2 overflow-hidden rounded-full bg-white/80 shadow-inner"
      >
        <div
          className="h-full rounded-full bg-[linear-gradient(90deg,#29b6a1,#1a4739)] transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="relative z-10 mb-3 flex items-center justify-between text-xs font-extrabold text-muted-brand">
        <span>{chapterLabel(step)}</span>
        <span>{Math.round(progress)}%</span>
      </div>
      <div key={step} className="relative z-10 flex flex-1 flex-col animate-soft-enter">
        {children}
      </div>
    </main>
  );
}
