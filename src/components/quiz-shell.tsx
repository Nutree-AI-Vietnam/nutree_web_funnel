'use client';

import { useEffect } from 'react';
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

  const progress = (stepIndex(step) / QUIZ_STEPS.length) * 100;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-5 pb-8 pt-4">
      <div className="mb-6 flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.push(prevRoute(step))}
          aria-label={vi.common.back}
          className="rounded-full p-2 text-slate-brand hover:bg-mist"
        >
          ←
        </button>
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-border-brand">
          <div
            className="h-full rounded-full bg-teal-brand transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
      <div className="flex flex-1 flex-col">{children}</div>
    </main>
  );
}
