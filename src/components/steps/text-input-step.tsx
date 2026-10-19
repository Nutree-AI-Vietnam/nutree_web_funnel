'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PrimaryButton } from '@/components/primary-button';
import { useCopy } from '@/lib/copy/use-copy';
import { goToNextQuizStep } from '@/lib/quiz/navigation';
import type { QuizStep } from '@/lib/quiz/steps';
import { useQuizStore } from '@/lib/quiz/store';
import { QuizStepFrame } from './quiz-step-frame';

export function NameAskStep({ step }: { step: QuizStep }) {
  const vi = useCopy();
  const router = useRouter();
  const saved = useQuizStore((s) => s.data.name);
  const setData = useQuizStore((s) => s.setData);
  const [value, setValue] = useState(saved ?? '');

  const rememberName = (raw: string) => {
    const name = raw.trim();
    setData({ name: name || undefined });
    return name;
  };

  const submit = () => {
    if (!rememberName(value)) return;
    goToNextQuizStep(router, step);
  };

  return (
    <QuizStepFrame title={vi.name_ask.question} description={vi.name_ask.description}>
      <div className="flex min-h-full flex-col justify-center">
        <input
          type="text"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            rememberName(e.target.value);
          }}
          onKeyDown={(e) => e.key === 'Enter' && value.trim() && submit()}
          placeholder={vi.name_ask.placeholder}
          autoFocus
          className="ph-no-capture rounded-2xl border border-white/80 bg-white/90 px-5 py-4 text-xl font-semibold text-forest shadow-inner outline-none transition placeholder:text-muted-brand/65 focus:border-teal-brand focus:ring-4 focus:ring-teal-brand/10"
        />
      </div>
      <div className="mt-auto pt-3">
        <PrimaryButton disabled={!value.trim()} onClick={submit}>
          {vi.common.continue}
        </PrimaryButton>
      </div>
    </QuizStepFrame>
  );
}
