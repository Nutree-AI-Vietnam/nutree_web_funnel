'use client';

import { useEffect } from 'react';
import type { CSSProperties } from 'react';
import { useRouter } from 'next/navigation';
import { NutreeLogo } from '@/components/nutree-logo';
import { BackgroundBeams } from '@/components/ui/background-beams';
import { ExitIntentModal } from '@/components/exit-intent-modal';
import { GoalLanguageMenu } from '@/components/goal-entry-footer';
import { trackStepViewed } from '@/lib/analytics/track';
import { useCopy } from '@/lib/copy/use-copy';
import { useBrowserBack } from '@/lib/funnel/browser-back';
import { SKIP_LANDING } from '@/lib/funnel/skip-landing';
import { goToPreviousQuizStep } from '@/lib/quiz/navigation';
import { QUIZ_STEPS, VALUE_TOUR_STEPS, stepIndex, type QuizStep } from '@/lib/quiz/steps';
import { useHydrated } from '@/lib/quiz/store';
import { cn } from '@/lib/utils';

function enterStyle(order: number): CSSProperties {
  return { '--enter': String(order) } as CSSProperties;
}

/** Steps built around a wheel picker; they fill the viewport instead of growing past it. */
const FIT_VIEWPORT_STEPS: readonly QuizStep[] = ['age', 'height', 'weight', 'target_weight'];

export function QuizShell({
  step,
  children,
  progressIndex,
  onBack,
  showExitIntent = true,
  renderBeforeHydration = false,
}: {
  step: QuizStep;
  children: React.ReactNode;
  /** 1-based position on the shared quiz + value-tour bar. */
  progressIndex?: number;
  onBack?: () => void;
  showExitIntent?: boolean;
  /** Draw this step in the server HTML. Only safe when `step` does not come from saved answers. */
  renderBeforeHydration?: boolean;
}) {
  const router = useRouter();
  const copy = useCopy();
  const hydrated = useHydrated();
  const totalSteps = QUIZ_STEPS.length + VALUE_TOUR_STEPS.length;
  const currentStep = progressIndex ?? stepIndex(step);
  const hideBack = SKIP_LANDING && step === 'goal' && progressIndex == null && !onBack;
  const goBack = () => (onBack ? onBack() : goToPreviousQuizStep(router, step));
  // The phone's Back button does what ← does, also on the loader, which has no ←.
  useBrowserBack(hideBack ? null : goBack, 1);

  useEffect(() => {
    // Saved progress is applied before `hydrated` flips, so this is the restored step.
    if (hydrated && progressIndex == null) trackStepViewed(step);
  }, [hydrated, progressIndex, step]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [step]);

  if (!hydrated && !renderBeforeHydration) return null;

  const progress = (currentStep / totalSteps) * 100;
  const fitViewport = FIT_VIEWPORT_STEPS.includes(step);

  return (
    <main
      data-fit-viewport={fitViewport || undefined}
      className={cn(
        'quiz-shell relative mx-auto flex h-dvh w-full max-w-lg flex-col overflow-hidden px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(0.65rem,env(safe-area-inset-top))] sm:pt-4',
      )}
    >
      <BackgroundBeams className="opacity-70" />
      {/* z-20 keeps the language dropdown above the progress bar and the step below it. */}
      <div className="quiz-shell-header enter-item relative z-20 mb-3 flex shrink-0 items-center justify-between gap-3" style={enterStyle(0)}>
        {hideBack ? (
          <div aria-hidden="true" className="w-14" />
        ) : step === 'calculating' ? (
          <div aria-hidden="true" className="min-w-11" />
        ) : (
          <button
            type="button"
            onClick={goBack}
            aria-label={copy.common.back}
            className="-ml-5 grid h-11 w-11 place-items-center text-xl font-bold text-slate-brand transition active:scale-95 focus:outline-none focus-visible:ring-4 focus-visible:ring-teal-brand/25"
          >
            ←
          </button>
        )}
        <NutreeLogo alt="Nutree" priority className="h-11 w-11" />
        {/* Equal side widths keep the logo centred. */}
        {hideBack ? (
          <div className="flex w-14 justify-end">
            <GoalLanguageMenu />
          </div>
        ) : (
          <div aria-hidden="true" className="min-w-11" />
        )}
      </div>
      {step !== 'goal' && step !== 'welcome' && (
        <div
          role="progressbar"
          aria-label={copy.common.progress}
          aria-valuemin={1}
          aria-valuemax={totalSteps}
          aria-valuenow={currentStep}
          className="quiz-shell-progress enter-item relative z-10 mb-4 h-1 shrink-0 overflow-hidden rounded-full bg-forest/10"
          style={enterStyle(1)}
        >
          <div
            className="h-full rounded-full bg-[linear-gradient(90deg,#17453a,#1fa892)] transition-[width] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
            style={{ width: `${Math.max(progress, 4)}%` }}
          />
        </div>
      )}
      <div
        key={progressIndex ?? step}
        className={cn(
          'quiz-shell-content relative z-10 flex min-h-0 flex-1 flex-col overflow-hidden',
        )}
      >
        {children}
      </div>
      {showExitIntent && <ExitIntentModal currentStepIndex={stepIndex(step)} />}
    </main>
  );
}
