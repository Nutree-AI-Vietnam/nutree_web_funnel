'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PrimaryButton } from '@/components/primary-button';
import { vi } from '@/lib/copy/vi';
import { nextRoute, type QuizStep } from '@/lib/quiz/steps';
import { useQuizStore } from '@/lib/quiz/store';

export function NameAskStep({ step }: { step: QuizStep }) {
  const router = useRouter();
  const saved = useQuizStore((s) => s.data.name);
  const setData = useQuizStore((s) => s.setData);
  const [value, setValue] = useState(saved ?? '');

  const submit = () => {
    setData({ name: value.trim() || undefined });
    router.push(nextRoute(step));
  };

  return (
    <div className="flex flex-1 flex-col gap-4">
      <h1 className="text-2xl font-bold text-forest">{vi.name_ask.question}</h1>
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && value.trim() && submit()}
        placeholder={vi.name_ask.placeholder}
        autoFocus
        className="rounded-2xl border-2 border-border-brand bg-white px-5 py-4 text-lg outline-none focus:border-teal-brand"
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
    </div>
  );
}
