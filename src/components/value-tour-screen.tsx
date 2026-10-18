'use client';

import { useEffect, useState } from 'react';
import { PrimaryButton } from '@/components/primary-button';
import { QuizShell } from '@/components/quiz-shell';
import { QuizStepFrame } from '@/components/steps/quiz-step-frame';
import { ActivityDemo, GuideDemo, HowItWorksList, MacroDemo, MealCardsDemo, MealSnapDemo, ReferenceSources } from '@/components/value-tour/value-tour-demos';
import { trackStepViewed } from '@/lib/analytics/track';
import { useCopy, useLocale } from '@/lib/copy/use-copy';
import { VALUE_TOUR_STEPS, valueProgressIndex, type ValueTourStep } from '@/lib/quiz/steps';
import { useHydrated, useQuizStore } from '@/lib/quiz/store';
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
  const locale = useLocale();
  const hydrated = useHydrated();
  const lead = useQuizStore((state) => state.lead);
  const data = useQuizStore((state) => state.data);
  const storedTdee = useQuizStore((state) => state.tdee);
  const [step, setStep] = useState<ValueTourStep>('guide');
  const tdee = storedTdee ?? computeTdeeResult(data);
  const numberLocale = locale === 'vi' ? 'vi-VN' : 'en-US';

  useEffect(() => {
    if (hydrated && !lead) onMissingLead();
  }, [hydrated, lead, onMissingLead]);

  useEffect(() => {
    trackStepViewed(`value_${step}`);
  }, [step]);

  if (!hydrated || !lead) return null;

  const index = VALUE_TOUR_STEPS.indexOf(step);
  const isLast = index === VALUE_TOUR_STEPS.length - 1;
  const screen = step === 'works'
    ? { eyebrow: copy.science.eyebrow, title: copy.science.headline, body: copy.science.hint, cta: copy.common.continue }
    : step === 'sources'
      ? { eyebrow: copy.science.sourcesEyebrow, title: copy.science.sourcesTitle, body: copy.science.sourcesIntro, cta: copy.common.continue }
      : copy.valueTour[step];
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
  const detail = step === 'macros' && tdee
    ? copy.valueTour.macros.personalized(Math.round(tdee.calories).toLocaleString(numberLocale), Math.round(tdee.protein_g))
    : step === 'activity' && data.training_days_per_week != null
      ? copy.valueTour.activity.personalized(data.training_days_per_week)
      : screen.body;

  return (
    <QuizShell step="progress" progressIndex={valueProgressIndex(step)} onBack={goBack} showExitIntent={false}>
      <QuizStepFrame title={screen.title} eyebrow={screen.eyebrow} description={detail}>
        {step === 'guide' && <GuideDemo points={copy.valueTour.guide.points} />}
        {step === 'snap' && <MealSnapDemo label={copy.valueTour.snap.videoLabel} />}
        {step === 'activity' && (
          <ActivityDemo
            src={locale === 'vi' ? '/value-tour/workout-vi.png' : '/value-tour/workout-en.png'}
            alt={copy.valueTour.activity.imageAlt}
          />
        )}
        {step === 'macros' && <MacroDemo alt={copy.valueTour.macros.imageAlt} days={copy.valueTour.macros.days} />}
        {step === 'works' && <HowItWorksList items={copy.science.items} />}
        {step === 'sources' && (
          <>
            <ReferenceSources sources={copy.science.sources} />
            <p className="text-sm font-semibold leading-relaxed text-muted-brand">{copy.science.disclaimer}</p>
          </>
        )}
        {step === 'meals' && <MealCardsDemo cards={copy.valueTour.meals.cards} />}
        <div className="mt-auto pt-3">
          <PrimaryButton onClick={advance}>{isLast ? copy.valueTour.meals.cta : copy.common.continue}</PrimaryButton>
        </div>
      </QuizStepFrame>
    </QuizShell>
  );
}
