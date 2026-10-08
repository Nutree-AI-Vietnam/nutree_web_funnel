'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import { BackgroundBeams } from '@/components/ui/background-beams';
import { ExitIntentModal } from '@/components/exit-intent-modal';
import { trackStepViewed } from '@/lib/analytics/track';
import { useCopy } from '@/lib/copy/use-copy';
import { goToPreviousQuizStep } from '@/lib/quiz/navigation';
import { QUIZ_STEPS, stepIndex, type QuizStep } from '@/lib/quiz/steps';
import { useHydrated } from '@/lib/quiz/store';
import { cn } from '@/lib/utils';

const LAST_INDEX_KEY = 'quiz:lastIndex';

/** Steps built around a wheel picker; they fill the viewport instead of growing past it. */
const FIT_VIEWPORT_STEPS: readonly QuizStep[] = ['age', 'height', 'weight', 'target_weight'];

export function QuizShell({ step, children }: { step: QuizStep; children: React.ReactNode }) {
  const router = useRouter();
  const copy = useCopy();
  const hydrated = useHydrated();
  const currentStep = stepIndex(step);

  // Keep the animation direction when client-side navigation updates this single page.
  const [initialPreviousIndex] = useState(() => {
    if (typeof window === 'undefined') return 1;
    const prev = window.sessionStorage.getItem(LAST_INDEX_KEY);
    const prevIdx = prev != null ? Number(prev) : currentStep;
    return Number.isFinite(prevIdx) ? prevIdx : currentStep;
  });
  const previousStepRef = useRef(currentStep);
  const [stepDirection, setStepDirection] = useState<1 | -1>(
    currentStep < initialPreviousIndex ? -1 : 1,
  );
  const [reduceMotion] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  useEffect(() => {
    trackStepViewed(step);
  }, [step]);

  useEffect(() => {
    const previousStep = previousStepRef.current;
    if (previousStep !== currentStep) {
      setStepDirection(currentStep < previousStep ? -1 : 1);
    }
    previousStepRef.current = currentStep;
    window.sessionStorage.setItem(LAST_INDEX_KEY, String(currentStep));
  }, [currentStep]);

  if (!hydrated) return null;

  const progress = (currentStep / QUIZ_STEPS.length) * 100;
  const fitViewport = FIT_VIEWPORT_STEPS.includes(step);

  return (
    <main
      data-fit-viewport={fitViewport || undefined}
      className={cn(
        'quiz-shell relative mx-auto flex w-full max-w-lg flex-col overflow-hidden px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))] sm:pt-5',
        fitViewport ? 'h-dvh' : 'min-h-dvh',
      )}
    >
      <BackgroundBeams className="opacity-70" />
      <div className="quiz-shell-header relative z-10 mb-4 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => goToPreviousQuizStep(router, step)}
          aria-label={copy.common.back}
          className="grid min-h-11 min-w-11 place-items-center rounded-full border border-white/70 bg-white/70 text-lg font-bold text-slate-brand shadow-[inset_0_0_0_1px_rgb(255_255_255_/_0.5),0_2px_8px_rgb(16_39_32_/_0.06)] backdrop-blur transition hover:-translate-y-px hover:bg-white active:scale-95 focus:outline-none focus-visible:ring-4 focus-visible:ring-teal-brand/20"
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
        aria-label={copy.common.progress}
        aria-valuemin={1}
        aria-valuemax={QUIZ_STEPS.length}
        aria-valuenow={currentStep}
        className="quiz-shell-progress relative z-10 mb-6 h-1 overflow-hidden rounded-full bg-forest/10"
      >
        <div
          className="h-full rounded-full bg-[linear-gradient(90deg,#17453a,#1fa892)] transition-[width] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
          style={{ width: `${Math.max(progress, 4)}%` }}
        />
      </div>
      <motion.div
        key={step}
        initial={reduceMotion ? { opacity: 0 } : { opacity: 0, x: stepDirection * 32 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
        className={cn(
          'quiz-shell-content relative z-10 flex min-h-0 flex-1 flex-col',
          // Only scrolls when a step outgrows the screen. The negative margins give the
          // CTA shadow and focus ring room so the scroll box does not clip them.
          fitViewport && '-mx-5 -mb-6 overflow-y-auto overscroll-contain px-5 pb-6',
        )}
      >
        {children}
      </motion.div>
      <ExitIntentModal currentStepIndex={currentStep} />
    </main>
  );
}
