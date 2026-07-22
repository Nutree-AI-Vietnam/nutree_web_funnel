'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PrimaryButton } from '@/components/primary-button';
import { useCopy } from '@/lib/copy/use-copy';
import { nextRoute, type QuizStep } from '@/lib/quiz/steps';
import { useQuizStore } from '@/lib/quiz/store';
import { QuizStepFrame } from './quiz-step-frame';

export function NameAskStep({ step }: { step: QuizStep }) {
  const vi = useCopy();
  const router = useRouter();
  const saved = useQuizStore((s) => s.data.name);
  const setData = useQuizStore((s) => s.setData);
  const [value, setValue] = useState(saved ?? '');

  const submit = () => {
    setData({ name: value.trim() || undefined });
    router.push(nextRoute(step));
  };

  return (
    <QuizStepFrame title={vi.name_ask.question}>
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && value.trim() && submit()}
        placeholder={vi.name_ask.placeholder}
        autoFocus
        className="rounded-2xl border border-white/80 bg-white/90 px-5 py-4 text-lg font-semibold text-forest shadow-inner outline-none transition placeholder:text-muted-brand/65 focus:border-teal-brand focus:ring-4 focus:ring-teal-brand/10"
      />
      <div className="mt-auto flex flex-col gap-3 pt-6">
        <PrimaryButton disabled={!value.trim()} onClick={submit}>
          {vi.common.continue}
        </PrimaryButton>
        <button
          type="button"
          onClick={() => {
            setData({ name: undefined });
            router.push(nextRoute(step));
          }}
          className="py-2 text-sm font-medium text-muted-brand hover:text-slate-brand"
        >
          {vi.common.skip}
        </button>
      </div>
    </QuizStepFrame>
  );
}
