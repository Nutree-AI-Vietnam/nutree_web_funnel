'use client';

import { useEffect, useLayoutEffect } from 'react';
import type { CSSProperties } from 'react';
import { useRouter } from 'next/navigation';
import { NutreeLogo } from '@/components/nutree-logo';
import { ExitIntentModal } from '@/components/exit-intent-modal';
import { GoalLanguageMenu } from '@/components/goal-entry-footer';
import { trackStepViewed } from '@/lib/analytics/track';
import { useBrowserBack } from '@/lib/funnel/browser-back';
import { SKIP_LANDING } from '@/lib/funnel/skip-landing';
import { goToPreviousQuizStep } from '@/lib/quiz/navigation';
import { useCopy, useLocale } from '@/lib/copy/use-copy';
import { nearestQuizStep, quizStepsFor, stepIndex, VALUE_TOUR_STEPS, viChapter, type QuizStep, type ViChapter } from '@/lib/quiz/steps';
import { useHydrated, useQuizStore } from '@/lib/quiz/store';
import { cn } from '@/lib/utils';

function enterStyle(order: number): CSSProperties {
  return { '--enter': String(order) } as CSSProperties;
}

/** Steps built around a wheel picker; they fill the viewport instead of growing past it. */
const FIT_VIEWPORT_STEPS: readonly QuizStep[] = ['height', 'weight', 'target_weight'];

/** English interstitials and the opening question. The bar starts once the visitor is answering. */
const HIDE_PROGRESS_STEPS: readonly QuizStep[] = ['goal', 'proof', 'progress', 'with_you'];

const VI_CHAPTERS: readonly ViChapter[] = ['you', 'body', 'habits', 'plan'];

function ChapterProgress({ step }: { step: QuizStep }) {
  const copy = useCopy();
  const steps = quizStepsFor('vi');
  const chapter = viChapter(step);
  const inChapter = steps.filter((item) => viChapter(item) === chapter);
  const indexInChapter = Math.max(0, inChapter.indexOf(step));
  const fill = inChapter.length === 0 ? 0 : (indexInChapter + 1) / inChapter.length;
  const current = stepIndex(step, 'vi');

  return (
    <div className="quiz-shell-progress enter-item relative z-10 mb-4 w-full max-w-lg shrink-0" style={enterStyle(1)}>
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <p className="text-[0.72rem] font-extrabold uppercase tracking-[0.08em] text-teal-brand">{copy.quizChapters[chapter]}</p>
        <p className="text-[0.72rem] font-semibold tabular-nums text-muted-brand">
          {current}/{steps.length}
        </p>
      </div>
      <div
        role="progressbar"
        aria-label={copy.common.progress}
        aria-valuemin={1}
        aria-valuemax={steps.length + VALUE_TOUR_STEPS.length}
        aria-valuenow={current}
        className="flex gap-1.5"
      >
        {VI_CHAPTERS.map((id) => {
          const chapterIndex = VI_CHAPTERS.indexOf(id);
          const activeIndex = VI_CHAPTERS.indexOf(chapter);
          const width = chapterIndex < activeIndex ? 1 : id === chapter ? fill : 0;
          return (
            <span key={id} className="h-1.5 flex-1 overflow-hidden rounded-full bg-forest/10">
              <span
                className="block h-full rounded-full bg-[linear-gradient(90deg,#17453a,#1fa892)] transition-[width] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
                style={{ width: `${width * 100}%` }}
              />
            </span>
          );
        })}
      </div>
    </div>
  );
}

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
  const locale = useLocale();
  const hydrated = useHydrated();
  const setCurrentStep = useQuizStore((state) => state.setCurrentStep);
  const steps = quizStepsFor(locale);
  const totalSteps = steps.length + VALUE_TOUR_STEPS.length;
  const currentStep = progressIndex ?? stepIndex(step, locale);
  const hideBack = SKIP_LANDING && step === 'goal' && progressIndex == null && !onBack;
  const goBack = () => (onBack ? onBack() : goToPreviousQuizStep(router, step));
  // The phone's Back button does what ← does, also on the loader, which has no ←.
  useBrowserBack(hideBack ? null : goBack, 1);
  const shownStep = progressIndex == null && hydrated && !steps.includes(step) ? nearestQuizStep(step, locale) : step;

  useLayoutEffect(() => {
    if (!hydrated || progressIndex != null || steps.includes(step)) return;
    setCurrentStep(nearestQuizStep(step, locale));
  }, [hydrated, locale, progressIndex, setCurrentStep, step, steps]);

  useEffect(() => {
    // Saved progress is applied before `hydrated` flips, so this is the restored step.
    if (hydrated && progressIndex == null) trackStepViewed(shownStep);
  }, [hydrated, progressIndex, shownStep]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [step]);

  if (!hydrated && !renderBeforeHydration) return null;

  const progress = (currentStep / totalSteps) * 100;
  const fitViewport = FIT_VIEWPORT_STEPS.includes(shownStep);
  const hideProgress = progressIndex == null && (locale === 'en' ? HIDE_PROGRESS_STEPS.includes(shownStep) : shownStep === 'calculating');
  const chaptered = locale !== 'en' && progressIndex == null && !hideProgress;

  return (
    <div className="flex h-dvh w-full justify-center bg-[#f4f7f5]">
    <main
      data-fit-viewport={fitViewport || undefined}
      className="quiz-shell relative flex h-dvh w-full max-w-lg flex-col overflow-hidden bg-[#f4f7f5] px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(0.65rem,env(safe-area-inset-top))] sm:pt-4"
    >
      {/* z-20 keeps the language dropdown above the progress bar and the step below it. */}
      <div className="quiz-shell-header enter-item relative z-20 mb-3 flex w-full max-w-lg shrink-0 items-center justify-between gap-3 pt-4" style={enterStyle(0)}>
        {hideBack ? (
          <div aria-hidden="true" className="w-14" />
        ) : shownStep === 'calculating' ? (
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
      {chaptered ? <ChapterProgress step={shownStep} /> : null}
      {!hideProgress && !chaptered && (
        <div
          role="progressbar"
          aria-label={copy.common.progress}
          aria-valuemin={1}
          aria-valuemax={totalSteps}
          aria-valuenow={currentStep}
          className="quiz-shell-progress enter-item relative z-10 mb-4 h-1 w-full max-w-lg shrink-0 overflow-hidden rounded-full bg-forest/10"
          style={enterStyle(1)}
        >
          <div
            className="h-full rounded-full bg-[linear-gradient(90deg,#17453a,#1fa892)] transition-[width] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
            style={{ width: `${Math.max(progress, 4)}%` }}
          />
        </div>
      )}
      <div
        key={progressIndex ?? shownStep}
        className={cn(
          'quiz-shell-content relative z-10 flex min-h-0 w-full max-w-lg flex-1 flex-col overflow-hidden',
        )}
      >
        {children}
      </div>
      {showExitIntent && <ExitIntentModal currentStepIndex={stepIndex(shownStep, locale)} />}
    </main>
    </div>
  );
}
