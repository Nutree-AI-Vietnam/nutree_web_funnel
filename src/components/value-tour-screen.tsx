'use client';

import { useEffect, useState } from 'react';
import { PrimaryButton } from '@/components/primary-button';
import { QuizShell } from '@/components/quiz-shell';
import { FirstChangesCard, PlanDayCard, PlanGoalCard } from '@/components/plan/plan-overview';
import { QuizStepFrame } from '@/components/steps/quiz-step-frame';
import { ActivityDemo, GuideDemo, HowItWorksList, MacroDemo, MealCardsDemo, MealSnapDemo, ReferenceSources } from '@/components/value-tour/value-tour-demos';
import { trackStepViewed } from '@/lib/analytics/track';
import { useCopy, useLocale } from '@/lib/copy/use-copy';
import { valueProgressIndex, valueTourSteps, type ValueTourStep } from '@/lib/quiz/steps';
import { useHydrated, useQuizStore } from '@/lib/quiz/store';
import { useUnits } from '@/lib/quiz/use-units';
import { computeTdeeResult } from '@/lib/tdee/calculator';

export function ValueTourScreen({
  startAt = 'first',
  onComplete,
  onBack,
  onMissingLead,
}: {
  /** The tour screen to open on: the last one when the visitor comes back from the paywall. */
  startAt?: 'first' | 'last';
  onComplete: () => void;
  onBack: () => void;
  onMissingLead: () => void;
}) {
  const copy = useCopy();
  const locale = useLocale();
  const hydrated = useHydrated();
  const { system } = useUnits();
  const lead = useQuizStore((state) => state.lead);
  const data = useQuizStore((state) => state.data);
  const storedTdee = useQuizStore((state) => state.tdee);
  const steps = valueTourSteps(locale);
  const [step, setStep] = useState<ValueTourStep>(() => (startAt === 'last' ? steps[steps.length - 1] : steps[0]));
  const tdee = storedTdee ?? computeTdeeResult(data);
  const tour = copy.funnel.tour;
  const guided = copy.valueTour;

  useEffect(() => {
    if (hydrated && !lead) onMissingLead();
  }, [hydrated, lead, onMissingLead]);

  useEffect(() => {
    trackStepViewed(`value_${step}`);
  }, [step]);

  if (!hydrated || !lead) return null;

  const index = steps.indexOf(step);
  const advance = () => {
    const next = steps[index + 1];
    if (next) setStep(next);
    else onComplete();
  };
  const goBack = () => {
    const previous = steps[index - 1];
    if (previous) setStep(previous);
    else onBack();
  };
  const button = (label: string) => (
    <div className="mt-auto pt-3">
      <PrimaryButton onClick={advance}>{label}</PrimaryButton>
    </div>
  );

  return (
    <QuizShell step="confidence" progressIndex={valueProgressIndex(step, locale)} onBack={goBack} showExitIntent={false}>
      {step === 'guide' && (
        <QuizStepFrame eyebrow={guided.guide.eyebrow} title={guided.guide.title}>
          <GuideDemo points={guided.guide.points} />
          {button(guided.guide.cta)}
        </QuizStepFrame>
      )}
      {step === 'snap' && (
        locale === 'vi' ? (
          <QuizStepFrame eyebrow={guided.snap.eyebrow} title={guided.snap.title} description={guided.snap.body}>
            <MealSnapDemo label={guided.snap.videoLabel} compact />
            {button(guided.snap.cta)}
          </QuizStepFrame>
        ) : (
          <QuizStepFrame eyebrow={tour.snap.eyebrow} title={tour.snap.title} description={tour.snap.body}>
            <MealSnapDemo label={guided.snap.videoLabel} compact />
            {button(tour.snap.cta)}
          </QuizStepFrame>
        )
      )}
      {step === 'activity' && (
        <QuizStepFrame eyebrow={guided.activity.eyebrow} title={guided.activity.title} description={guided.activity.body}>
          <ActivityDemo src={locale === 'vi' ? '/value-tour/workout-vi.png' : '/value-tour/workout-en.png'} alt={guided.activity.imageAlt} compact />
          {button(guided.activity.cta)}
        </QuizStepFrame>
      )}
      {step === 'macros' && (
        <QuizStepFrame eyebrow={guided.macros.eyebrow} title={guided.macros.title} description={guided.macros.body}>
          <MacroDemo alt={guided.macros.imageAlt} days={guided.macros.days} />
          {button(guided.macros.cta)}
        </QuizStepFrame>
      )}
      {step === 'works' && (
        <QuizStepFrame eyebrow={copy.science.eyebrow} title={copy.science.headline} description={copy.science.hint}>
          <HowItWorksList items={copy.science.items} />
          {button(copy.science.cta)}
        </QuizStepFrame>
      )}
      {step === 'sources' && (
        <QuizStepFrame title={tour.sources.title} description={tour.sources.body}>
          <ReferenceSources sources={copy.science.sources} />
          {button(tour.sources.cta)}
        </QuizStepFrame>
      )}
      {step === 'meals' && (
        <QuizStepFrame eyebrow={guided.meals.eyebrow} title={guided.meals.title} description={guided.meals.body}>
          <MealCardsDemo cards={guided.meals.cards} />
          {button(guided.meals.cta)}
        </QuizStepFrame>
      )}
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
          {button(tour.plan.cta)}
        </QuizStepFrame>
      )}
    </QuizShell>
  );
}
