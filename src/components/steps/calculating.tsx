'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { previewTdee } from '@/lib/api/client';
import { vi } from '@/lib/copy/vi';
import { nextRoute } from '@/lib/quiz/steps';
import { useQuizStore } from '@/lib/quiz/store';
import { computeTdeeResult } from '@/lib/tdee/calculator';

const STAGE_MS = 1000;

export function CalculatingStep() {
  const router = useRouter();
  const data = useQuizStore((s) => s.data);
  const setTdee = useQuizStore((s) => s.setTdee);
  const [stage, setStage] = useState(0);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const timer = setInterval(
      () => setStage((s) => Math.min(s + 1, vi.calculating.steps.length - 1)),
      STAGE_MS,
    );
    const minDelay = new Promise((resolve) =>
      setTimeout(resolve, STAGE_MS * vi.calculating.steps.length),
    );

    const fetchTdee = previewTdee(data)
      .then((result) => ({ result, source: 'api' as const }))
      .catch(() => {
        const fallback = computeTdeeResult(data);
        return fallback ? { result: fallback, source: 'fallback' as const } : null;
      });

    Promise.all([fetchTdee, minDelay]).then(([outcome]) => {
      clearInterval(timer);
      if (outcome) {
        setTdee(outcome.result, outcome.source);
        router.push(nextRoute('calculating'));
      } else {
        router.push('/quiz/name_ask');
      }
    });

    return () => clearInterval(timer);
  }, [data, router, setTdee]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 text-center">
      <div className="h-16 w-16 animate-spin rounded-full border-4 border-mist border-t-teal-brand" />
      <h1 className="text-2xl font-bold text-forest">
        {vi.calculating.text.replace('[name]', data.name || vi.reflection.fallbackName)}
      </h1>
      <p className="text-slate-brand" aria-live="polite">
        {vi.calculating.steps[stage]}
      </p>
    </div>
  );
}
