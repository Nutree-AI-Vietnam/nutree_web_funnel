'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PrimaryButton } from '@/components/primary-button';
import { useCopy } from '@/lib/copy/use-copy';
import { deriveAge } from '@/lib/quiz/dob';
import { nextRoute } from '@/lib/quiz/steps';
import { useQuizStore } from '@/lib/quiz/store';
import { isMetricValueValid, MetricInput, parseMetricDraft } from './metric-input';
import { QuizStepFrame } from './quiz-step-frame';

export function BirthDateStep() {
  const router = useRouter();
  const copy = useCopy();
  const saved = useQuizStore((state) => state.data);
  const setData = useQuizStore((state) => state.setData);
  const savedAge = deriveAge(saved);
  const [age, setAge] = useState(savedAge ? String(savedAge) : '');
  const [attempted, setAttempted] = useState(false);
  const valid = isMetricValueValid(age, 18, 100);

  const submit = () => {
    setAttempted(true);
    if (!valid) return;
    const parsedAge = parseMetricDraft(age);
    if (!parsedAge) return;
    setData({
      birth_year: new Date().getFullYear() - parsedAge,
      birth_month: 1,
      birth_day: 1,
    });
    router.push(nextRoute('age'));
  };

  return (
    <QuizStepFrame title={copy.age.question} hint={copy.age.hint}>
      <form className="flex flex-1 flex-col gap-4" onSubmit={(event) => { event.preventDefault(); submit(); }}>
        <MetricInput
          id="age"
          label={copy.age.label}
          unit={copy.age.unit}
          value={age}
          min={18}
          max={100}
          step={1}
          hint={copy.age.hint}
          error={attempted && !valid ? copy.metric.rangeError(copy.age.label, 18, 100, copy.age.unit) : undefined}
          onChange={setAge}
          onBlur={() => setAttempted(true)}
        />
        <div className="mt-auto pt-6"><PrimaryButton type="submit">{copy.common.continue}</PrimaryButton></div>
      </form>
    </QuizStepFrame>
  );
}
