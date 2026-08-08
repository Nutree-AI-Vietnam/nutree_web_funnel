'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PrimaryButton } from '@/components/primary-button';
import { useCopy } from '@/lib/copy/use-copy';
import { validateAge } from '@/lib/quiz/dob';
import { nextRoute } from '@/lib/quiz/steps';
import { useQuizStore } from '@/lib/quiz/store';
import { MetricInput, parseMetricDraft } from './metric-input';
import { QuizStepFrame } from './quiz-step-frame';

export function BirthDateStep() {
  const router = useRouter();
  const copy = useCopy();
  const savedAge = useQuizStore((state) => state.data.age);
  const setData = useQuizStore((state) => state.setData);
  const [age, setAge] = useState(String(savedAge ?? 15));
  const [attempted, setAttempted] = useState(false);
  const parsedAge = parseMetricDraft(age);
  const valid = parsedAge != null && validateAge(parsedAge);

  const submit = () => {
    setAttempted(true);
    if (!valid) return;
    const birthYear = new Date().getFullYear() - parsedAge!;
    setData({ age: parsedAge!, birth_year: birthYear, birth_month: 1, birth_day: 1 });
    router.push(nextRoute('age'));
  };

  return (
    <QuizStepFrame title={copy.age.question} hint={copy.age.hint} className="gap-2">
      <form className="flex flex-1 flex-col gap-4" onSubmit={(event) => { event.preventDefault(); submit(); }}>
        <MetricInput
          id="age-input"
          label={copy.age.label}
          unit={copy.age.unit}
          value={age}
          min={12}
          max={100}
          step={1}
          bare
          variant="hero"
          error={attempted && age && !valid ? copy.metric.rangeError(copy.age.label, 12, 100, copy.age.unit) : undefined}
          onChange={setAge}
          onBlur={() => null}
        />
        <div className="mt-auto pt-6">
          <PrimaryButton type="submit" disabled={!valid}>{copy.common.continue}</PrimaryButton>
        </div>
      </form>
    </QuizStepFrame>
  );
}
