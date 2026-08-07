'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PrimaryButton } from '@/components/primary-button';
import { useCopy } from '@/lib/copy/use-copy';
import { validateBirthDate } from '@/lib/quiz/dob';
import { nextRoute } from '@/lib/quiz/steps';
import { useQuizStore } from '@/lib/quiz/store';
import { QuizStepFrame } from './quiz-step-frame';

export function BirthDateStep() {
  const router = useRouter();
  const copy = useCopy();
  const saved = useQuizStore((state) => state.data);
  const setData = useQuizStore((state) => state.setData);
  const [year, setYear] = useState(String(saved.birth_year ?? ''));
  const [month, setMonth] = useState(String(saved.birth_month ?? ''));
  const [day, setDay] = useState(String(saved.birth_day ?? ''));
  const [attempted, setAttempted] = useState(false);
  const birthDate = { birth_year: Number(year), birth_month: Number(month), birth_day: Number(day) };
  const valid = validateBirthDate(birthDate).valid;

  const submit = () => {
    setAttempted(true);
    if (!valid) return;
    setData(birthDate);
    router.push(nextRoute('age'));
  };

  return (
    <QuizStepFrame title={copy.age.question} hint={copy.age.hint}>
      <form className="flex flex-1 flex-col gap-4" onSubmit={(event) => { event.preventDefault(); submit(); }}>
        <div className="grid grid-cols-[1fr_1fr_1.35fr] gap-3">
          {[
            ['birth-month', 'MM', month, setMonth, 1, 12],
            ['birth-day', 'DD', day, setDay, 1, 31],
            ['birth-year', 'YYYY', year, setYear, 1900, new Date().getFullYear()],
          ].map(([id, placeholder, value, setValue, min, max]) => (
            <input key={String(id)} id={String(id)} aria-label={String(placeholder)} inputMode="numeric" placeholder={String(placeholder)} value={String(value)} min={Number(min)} max={Number(max)} onChange={(event) => (setValue as (value: string) => void)(event.target.value.replace(/\D/g, ''))} className="min-h-14 rounded-2xl border border-border-brand bg-white px-3 text-center text-lg font-extrabold text-forest outline-none focus:border-teal-brand focus:ring-4 focus:ring-teal-brand/20" />
          ))}
        </div>
        {attempted && !valid && <p role="alert" className="text-sm font-bold text-error-brand">Enter a valid birth date for an adult aged 18 to 100.</p>}
        <div className="mt-auto pt-6"><PrimaryButton type="submit">{copy.common.continue}</PrimaryButton></div>
      </form>
    </QuizStepFrame>
  );
}
