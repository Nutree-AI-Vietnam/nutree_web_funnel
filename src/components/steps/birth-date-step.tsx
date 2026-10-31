'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PrimaryButton } from '@/components/primary-button';
import { useCopy } from '@/lib/copy/use-copy';
import { MIN_AGE, validateAge } from '@/lib/quiz/dob';
import { goToNextQuizStep } from '@/lib/quiz/navigation';
import { useQuizStore } from '@/lib/quiz/store';
import { MetricInput, parseMetricDraft } from './metric-input';
import { QuizStepFrame } from './quiz-step-frame';

/** Picker start for a new quiz: a typical adult age, so taps-through do not produce a teen plan. */
const DEFAULT_AGE = 25;

const AGE_GROUP_START = { '18_29': 24, '30_39': 34, '40_49': 44, '50_plus': 55 } as const;

function defaultAgeForGroup(group: keyof typeof AGE_GROUP_START | undefined): number {
  return group ? AGE_GROUP_START[group] : DEFAULT_AGE;
}

export function BirthDateStep() {
  const router = useRouter();
  const copy = useCopy();
  const savedAge = useQuizStore((state) => state.data.age);
  const ageGroup = useQuizStore((state) => state.data.age_group);
  const setData = useQuizStore((state) => state.setData);
  const [age, setAge] = useState(String(savedAge ?? defaultAgeForGroup(ageGroup)));
  const [attempted, setAttempted] = useState(false);
  const parsedAge = parseMetricDraft(age);
  const valid = parsedAge != null && validateAge(parsedAge);

  const submit = () => {
    setAttempted(true);
    if (!valid) return;
    const birthYear = new Date().getFullYear() - parsedAge!;
    setData({ age: parsedAge!, birth_year: birthYear, birth_month: 1, birth_day: 1 });
    goToNextQuizStep(router, 'age');
  };

  return (
    <QuizStepFrame title={copy.age.question} hint={copy.age.hint} className="gap-2">
      <form className="quiz-number-form flex h-full min-h-0 flex-1 flex-col gap-4" onSubmit={(event) => { event.preventDefault(); submit(); }}>
        <div className="flex min-h-0 flex-1 flex-col">
        <MetricInput
          id="age-input"
          label={copy.age.label}
          unit={copy.age.unit}
          value={age}
          min={MIN_AGE}
          max={100}
          step={1}
          bare
          variant="hero"
          error={attempted && age && !valid ? copy.metric.rangeError(copy.age.label, MIN_AGE, 100, copy.age.unit) : undefined}
          onChange={setAge}
          onBlur={() => null}
        />
        </div>
        <div className="quiz-number-actions mt-auto shrink-0 pt-6">
          <PrimaryButton type="submit" disabled={!valid}>{copy.common.continue}</PrimaryButton>
        </div>
      </form>
    </QuizStepFrame>
  );
}
