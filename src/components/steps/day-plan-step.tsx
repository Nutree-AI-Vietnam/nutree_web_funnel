'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PrimaryButton } from '@/components/primary-button';
import { FirstChangesCard, PlanDayCard } from '@/components/plan/plan-overview';
import { QuizStepFrame } from '@/components/steps/quiz-step-frame';
import { useCopy } from '@/lib/copy/use-copy';
import { goToNextQuizStep, goToQuizStep } from '@/lib/quiz/navigation';
import { useQuizStore } from '@/lib/quiz/store';

/** A sample day, shown before the calorie result. */
export function DayPlanStep() {
  const copy = useCopy();
  const router = useRouter();
  const data = useQuizStore((state) => state.data);
  const tdee = useQuizStore((state) => state.tdee);
  const tour = copy.funnel.tour;

  useEffect(() => {
    if (!tdee) goToQuizStep(router, 'calculating');
  }, [router, tdee]);

  if (!tdee) return null;

  const title = data.name?.trim() ? copy.funnel.plan.eyebrow(data.name.trim()) : copy.funnel.plan.eyebrowFallback;

  return (
    <QuizStepFrame eyebrow={tour.plan.eyebrow} title={title}>
      <FirstChangesCard data={data} tdee={tdee} reveal />
      <PlanDayCard data={data} tdee={tdee} reveal targets={false} />
      <div className="mt-auto pt-3">
        <PrimaryButton onClick={() => goToNextQuizStep(router, 'day_plan')}>{tour.plan.cta}</PrimaryButton>
      </div>
    </QuizStepFrame>
  );
}
