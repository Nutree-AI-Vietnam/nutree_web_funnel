'use client';

import { useEffect, useState } from 'react';
import { PrimaryButton } from '@/components/primary-button';
import { QuizShell } from '@/components/quiz-shell';
import { FirstChangesCard, PlanDayCard, PlanGoalCard } from '@/components/plan/plan-overview';
import { QuizStepFrame } from '@/components/steps/quiz-step-frame';
import { MealSnapDemo, ReferenceSources } from '@/components/value-tour/value-tour-demos';
import { trackStepViewed } from '@/lib/analytics/track';
import { useCopy } from '@/lib/copy/use-copy';
import { VALUE_TOUR_STEPS, valueProgressIndex, type ValueTourStep } from '@/lib/quiz/steps';
import { useHydrated, useQuizStore } from '@/lib/quiz/store';
import { useUnits } from '@/lib/quiz/use-units';
import { computeTdeeResult } from '@/lib/tdee/calculator';

export function ValueTourScreen({
  initialStep = 'plan',
  onComplete,
  onBack,
  onMissingLead,
}: {
  /** The tour screen to open on: the last one when the visitor comes back from the paywall. */
  initialStep?: ValueTourStep;
  onComplete: () => void;
  onBack: () => void;
  onMissingLead: () => void;
}) {
  const copy = useCopy();
  const hydrated = useHydrated();
  const { system } = useUnits();
  const lead = useQuizStore((state) => state.lead);
  const data = useQuizStore((state) => state.data);
  const storedTdee = useQuizStore((state) => state.tdee);
  const [step, setStep] = useState<ValueTourStep>(initialStep);
  const tdee = storedTdee ?? computeTdeeResult(data);
  const tour = copy.funnel.tour;

  useEffect(() => {
    if (hydrated && !lead) onMissingLead();
  }, [hydrated, lead, onMissingLead]);

  useEffect(() => {
    trackStepViewed(`value_${step}`);
  }, [step]);

  if (!hydrated || !lead) return null;

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
    <QuizShell step="confidence" progressIndex={valueProgressIndex(step)} onBack={goBack} showExitIntent={false}>
      {step === 'plan' && (
        <QuizStepFrame eyebrow={tour.plan.eyebrow} title={data.name?.trim() ? copy.funnel.plan.eyebrow(data.name.trim()) : copy.funnel.plan.eyebrowFallback}>
          {/* The email unlocked the first three changes and the day of meals; lead with the changes. The result screen already showed the targets. */}
          {tdee ? (
            <>
              <FirstChangesCard data={data} tdee={tdee} reveal />
              <PlanDayCard data={data} tdee={tdee} reveal targets={false} />
            </>
          ) : (
            <PlanGoalCard data={data} tdee={tdee} system={system} />
          )}
          <div className="mt-auto pt-3">
            <PrimaryButton onClick={advance}>{tour.plan.cta}</PrimaryButton>
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
      {step === 'snap' && (
        <QuizStepFrame eyebrow={tour.snap.eyebrow} title={tour.snap.title} description={tour.snap.body}>
          <MealSnapDemo label={copy.valueTour.snap.videoLabel} compact />
          <div className="mt-auto pt-3">
            <PrimaryButton onClick={advance}>{tour.snap.cta}</PrimaryButton>
          </div>
        </QuizStepFrame>
      )}
    </QuizShell>
  );
}
