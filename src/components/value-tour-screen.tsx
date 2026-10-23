'use client';

import { useEffect, useState } from 'react';
import { PrimaryButton } from '@/components/primary-button';
import { QuizShell } from '@/components/quiz-shell';
import { MacroBars, PlanGoalCard } from '@/components/plan/plan-overview';
import { QuizStepFrame } from '@/components/steps/quiz-step-frame';
import { AppStoreRating, MealIdeas, MealSnapDemo } from '@/components/value-tour/value-tour-demos';
import { trackStepViewed } from '@/lib/analytics/track';
import { useCopy } from '@/lib/copy/use-copy';
import { VALUE_TOUR_STEPS, valueProgressIndex, type ValueTourStep } from '@/lib/quiz/steps';
import { useHydrated, useQuizStore } from '@/lib/quiz/store';
import { useUnits } from '@/lib/quiz/use-units';
import { computeTdeeResult } from '@/lib/tdee/calculator';

export function ValueTourScreen({
  onComplete,
  onBack,
  onMissingLead,
}: {
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
  const [step, setStep] = useState<ValueTourStep>('plan');
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
  const trainingDays = data.training_days_per_week;

  return (
    <QuizShell step="confidence" progressIndex={valueProgressIndex(step)} onBack={goBack} showExitIntent={false}>
      {step === 'plan' && (
        <QuizStepFrame eyebrow={tour.plan.eyebrow}>
          <PlanGoalCard data={data} tdee={tdee} system={system} />
          {tdee && (
            <section className="rounded-[1.6rem] bg-white/90 p-4 shadow-[0_10px_30px_rgb(26_71_57_/_0.06)]">
              <MacroBars tdee={tdee} />
              {trainingDays != null && trainingDays > 0 && (
                <p className="mt-3 text-sm font-semibold leading-relaxed text-slate-brand">{copy.valueTour.activity.personalized(trainingDays)}</p>
              )}
            </section>
          )}
          <div className="mt-auto pt-3">
            <PrimaryButton onClick={advance}>{tour.plan.cta}</PrimaryButton>
          </div>
        </QuizStepFrame>
      )}
      {step === 'snap' && (
        <QuizStepFrame eyebrow={tour.snap.eyebrow} title={tour.snap.title} description={tour.snap.body}>
          <MealSnapDemo label={copy.valueTour.snap.videoLabel} compact />
          {tdee && <MealIdeas title={tour.snap.ideasTitle} tdee={tdee} diet={data.dietary_preferences} />}
          <div className="mt-auto pt-3">
            <PrimaryButton onClick={advance}>{tour.snap.cta}</PrimaryButton>
          </div>
        </QuizStepFrame>
      )}
      {step === 'proof' && (
        <QuizStepFrame>
          <AppStoreRating />
          <section className="rounded-[1.6rem] bg-white/90 p-4 shadow-[0_10px_30px_rgb(26_71_57_/_0.06)]">
            <h2 className="text-[1.12rem] font-extrabold tracking-[-0.02em] text-forest">{tour.proof.title}</h2>
            <ul className="mt-3 grid gap-3">
              {tour.proof.benefits.map((benefit, position) => (
                <li key={benefit.title} className="grid grid-cols-[2rem_1fr] gap-3">
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-forest text-sm font-extrabold text-white">{position + 1}</span>
                  <span>
                    <span className="block text-[0.95rem] font-extrabold text-forest">{benefit.title}</span>
                    <span className="mt-0.5 block text-sm font-semibold leading-relaxed text-slate-brand">{benefit.body}</span>
                  </span>
                </li>
              ))}
            </ul>
          </section>
          <div className="mt-auto pt-3">
            <PrimaryButton onClick={advance}>{tour.proof.cta}</PrimaryButton>
          </div>
        </QuizStepFrame>
      )}
    </QuizShell>
  );
}
