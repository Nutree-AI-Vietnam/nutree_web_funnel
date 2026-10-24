'use client';

import { useRouter } from 'next/navigation';
import { OptionCard } from '@/components/option-card';
import { PrimaryButton } from '@/components/primary-button';
import { useCopy, useLocale } from '@/lib/copy/use-copy';
import { goToNextQuizStep } from '@/lib/quiz/navigation';
import { formatGoalDate, goalTimeline } from '@/lib/quiz/progress-projection';
import { useQuizStore, type PlanAnswers } from '@/lib/quiz/store';
import { formatWeight } from '@/lib/quiz/units';
import { useUnits } from '@/lib/quiz/use-units';
import { QuizStepFrame } from './quiz-step-frame';

type Confidence = NonNullable<PlanAnswers['confidence']>;

/** One commitment question after the projection, with a reply that answers the doubt. */
export function ConfidenceStep() {
  const router = useRouter();
  const copy = useCopy();
  const locale = useLocale();
  const { system } = useUnits();
  const data = useQuizStore((state) => state.data);
  const answer = useQuizStore((state) => state.planAnswers.confidence);
  const setPlanAnswers = useQuizStore((state) => state.setPlanAnswers);
  const confidence = copy.funnel.confidence;
  const timeline = goalTimeline(data);
  const question = timeline
    ? confidence.question(formatWeight(timeline.targetKg, system, locale), formatGoalDate(timeline.date, locale, false))
    : confidence.questionFallback;

  return (
    <QuizStepFrame title={question} description={confidence.description} className="gap-3">
      <div className="flex flex-col gap-2.5">
        {confidence.options.map((option) => (
          <OptionCard
            key={option.key}
            label={option.label}
            selected={answer === option.key}
            onClick={() => setPlanAnswers({ confidence: option.key as Confidence })}
          />
        ))}
      </div>
      {answer && (
        <p role="status" className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold leading-relaxed text-emerald-900">
          {confidence.replies[answer]}
        </p>
      )}
      <div className="mt-auto pt-3">
        <PrimaryButton disabled={!answer} onClick={() => goToNextQuizStep(router, 'confidence')}>{confidence.cta}</PrimaryButton>
      </div>
    </QuizStepFrame>
  );
}
