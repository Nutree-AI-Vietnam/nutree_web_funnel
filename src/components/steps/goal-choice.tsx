'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { OptionCard } from '@/components/option-card';
import { useCopy } from '@/lib/copy/use-copy';
import { goToNextQuizStep } from '@/lib/quiz/navigation';
import { useQuizStore } from '@/lib/quiz/store';
import type { OnboardingPayload } from '@/lib/quiz/types';
import { useUnits } from '@/lib/quiz/use-units';
import { QuizStepFrame } from './quiz-step-frame';

const OTHER_GOALS = ['bulk', 'recomp', 'maintain'] as const;
const GOAL_ICONS: Record<string, string> = { bulk: 'line:dumbbell', recomp: 'line:bolt', maintain: 'line:bowl' };

type LossBand = NonNullable<OnboardingPayload['weight_loss_band']>;

/** First screen: a weight-loss range that sets the cut goal, with the other goals one tap away. */
export function GoalChoice() {
  const c = useCopy();
  const router = useRouter();
  const { system } = useUnits();
  const goal = useQuizStore((s) => s.data.fitness_goal);
  const setData = useQuizStore((s) => s.setData);
  const [other, setOther] = useState(goal === 'bulk' || goal === 'recomp' || goal === 'maintain');
  const [pending, setPending] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const advance = (key: string, data: Partial<OnboardingPayload>) => {
    if (pending) return;
    setPending(key);
    setData(data);
    timerRef.current = setTimeout(() => goToNextQuizStep(router, 'goal'), 240);
  };

  if (other) {
    const options = c.goal.options.filter((option) => (OTHER_GOALS as readonly string[]).includes(option.key));
    return (
      <QuizStepFrame title={c.goal.otherQuestion} eyebrow={c.funnel.goalPromise} className="gap-3">
        <div className="flex flex-col gap-3">
          {options.map((option) => (
            <OptionCard
              key={option.key}
              label={option.label}
              icon={GOAL_ICONS[option.key]}
              hint={c.funnel.goalCardHints[option.key as keyof typeof c.funnel.goalCardHints]}
              large
              plain
              selected={pending === option.key}
              onClick={() => advance(option.key, { fitness_goal: option.key as 'bulk' | 'recomp' | 'maintain', weight_loss_band: undefined })}
            />
          ))}
        </div>
        <button type="button" onClick={() => setOther(false)} className="mt-2 min-h-11 w-full text-center text-sm font-semibold text-muted-brand underline decoration-muted-brand/40 underline-offset-4 focus:outline-none focus-visible:ring-4 focus-visible:ring-teal-brand/20">
          {c.goal.backToLoss}
        </button>
      </QuizStepFrame>
    );
  }

  return (
    <QuizStepFrame title={c.goal.question} eyebrow={c.funnel.goalPromise} className="gap-3">
      <div className="flex flex-col gap-3">
        {c.goal.lossBands.map((band) => (
          <OptionCard
            key={band.key}
            label={system === 'imperial' ? band.imperial : band.metric}
            large
            plain
            selected={pending === band.key}
            onClick={() => advance(band.key, { fitness_goal: 'cut', weight_loss_band: band.key as LossBand })}
          />
        ))}
      </div>
      <button type="button" onClick={() => setOther(true)} className="mt-2 min-h-11 w-full text-center text-sm font-semibold text-muted-brand underline decoration-muted-brand/40 underline-offset-4 focus:outline-none focus-visible:ring-4 focus-visible:ring-teal-brand/20">
        {c.goal.otherGoals}
      </button>
    </QuizStepFrame>
  );
}
