'use client';

import { useEffect, useState } from 'react';
import { PrimaryButton } from '@/components/primary-button';
import { QuizShell } from '@/components/quiz-shell';
import { QuizStepFrame } from '@/components/steps/quiz-step-frame';
import { ActivityDemo, MacroDemo, MealSnapDemo, ReferenceSources } from '@/components/value-tour/value-tour-demos';
import { trackStepViewed } from '@/lib/analytics/track';
import { useCopy, useLocale } from '@/lib/copy/use-copy';
import { VALUE_TOUR_STEPS, valueProgressIndex, type ValueTourStep } from '@/lib/quiz/steps';
import { useHydrated, useQuizStore } from '@/lib/quiz/store';
import { computeTdeeResult } from '@/lib/tdee/calculator';

export function ValueTourScreen({
  initialStep = 'snap',
  onComplete,
  onBack,
}: {
  /** The tour screen to open on. Back from email reopens the last one. */
  initialStep?: ValueTourStep;
  onComplete: () => void;
  onBack: () => void;
}) {
  const copy = useCopy();
  const locale = useLocale();
  const hydrated = useHydrated();
  const data = useQuizStore((state) => state.data);
  const storedTdee = useQuizStore((state) => state.tdee);
  const [step, setStep] = useState<ValueTourStep>(initialStep);
  const tdee = storedTdee ?? computeTdeeResult(data);
  const tour = copy.funnel.tour;
  const numberLocale = locale === 'vi' ? 'vi-VN' : 'en-US';

  useEffect(() => {
    trackStepViewed(`value_${step}`);
  }, [step]);

  if (!hydrated) return null;

  const index = VALUE_TOUR_STEPS.indexOf(step);
  const advance = () => {
    const next = VALUE_TOUR_STEPS[index + 1];
    if (next) setStep(next);
    else onComplete();
  };
  const goBack = () => {
    const previous = VALUE_TOUR_STEPS[index - 1];
    if (previous) setStep(previous);
    else onBack();
  };

  return (
    <QuizShell step="result" progressIndex={valueProgressIndex(step)} onBack={goBack} showExitIntent={false}>
      {step === 'snap' && (
        <QuizStepFrame eyebrow={copy.valueTour.snap.eyebrow} title={copy.valueTour.snap.title} description={copy.valueTour.snap.body}>
          <MealSnapDemo label={copy.valueTour.snap.videoLabel} />
          <div className="mt-auto pt-3">
            <PrimaryButton onClick={advance}>{copy.common.continue}</PrimaryButton>
          </div>
        </QuizStepFrame>
      )}
      {step === 'activity' && (
        <QuizStepFrame
          eyebrow={copy.valueTour.activity.eyebrow}
          title={copy.valueTour.activity.title}
          description={data.training_days_per_week != null ? copy.valueTour.activity.personalized(data.training_days_per_week) : copy.valueTour.activity.body}
        >
          <ActivityDemo src={locale === 'vi' ? '/value-tour/workout-vi.png' : '/value-tour/workout-en.png'} alt={copy.valueTour.activity.imageAlt} />
          <div className="mt-auto pt-3">
            <PrimaryButton onClick={advance}>{copy.valueTour.activity.cta}</PrimaryButton>
          </div>
        </QuizStepFrame>
      )}
      {step === 'macros' && (
        <QuizStepFrame
          eyebrow={copy.valueTour.macros.eyebrow}
          title={copy.valueTour.macros.title}
          description={tdee ? copy.valueTour.macros.personalized(Math.round(tdee.calories).toLocaleString(numberLocale), Math.round(tdee.protein_g)) : copy.valueTour.macros.body}
        >
          <MacroDemo alt={copy.valueTour.macros.imageAlt} days={copy.valueTour.macros.days} extraLabel={copy.valueTour.macros.extraLabel} />
          <div className="mt-auto pt-3">
            <PrimaryButton onClick={advance}>{copy.valueTour.macros.cta}</PrimaryButton>
          </div>
        </QuizStepFrame>
      )}
      {step === 'sources' && (
        <QuizStepFrame title={tour.sources.title} description={tour.sources.body}>
          <ReferenceSources sources={copy.science.sources} />
          <div className="mt-auto pt-3">
            <PrimaryButton onClick={advance}>{tour.sources.cta}</PrimaryButton>
          </div>
        </QuizStepFrame>
      )}
    </QuizShell>
  );
}
