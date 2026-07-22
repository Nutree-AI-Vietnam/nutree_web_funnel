'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { previewTdee } from '@/lib/api/client';
import { vi } from '@/lib/copy/vi';
import { nextRoute } from '@/lib/quiz/steps';
import { useQuizStore } from '@/lib/quiz/store';
import { computeTdeeResult } from '@/lib/tdee/calculator';

const STAGE_MS = 220;

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
    const minDelay = new Promise((resolve) => setTimeout(resolve, 900));

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

  const activePercent = Math.round(((stage + 1) / vi.calculating.steps.length) * 100);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
      <section className="relative w-full overflow-hidden rounded-[2rem] border border-white/80 bg-white/86 p-4 shadow-[0_26px_80px_rgb(26_71_57_/_0.16)] backdrop-blur">
        <div className="absolute inset-x-8 top-8 h-28 rounded-full bg-teal-brand/15 blur-3xl" />
        <div className="relative mx-auto flex h-36 w-36 items-center justify-center">
          <div className="analysis-ring absolute inset-0 rounded-full" />
          <div className="absolute inset-5 rounded-full border border-white bg-bg-brand shadow-inner" />
          <div className="relative flex h-[5.5rem] w-[5.5rem] flex-col items-center justify-center rounded-full bg-forest-dark text-white shadow-xl">
            <span className="text-lg font-extrabold">Nutree</span>
            <span className="mt-1 text-[0.7rem] font-bold text-teal-brand">Plan</span>
          </div>
          {vi.calculating.orbits.map((item, index) => (
            <span
              key={item}
              className="calculating-float absolute rounded-full border border-white/90 bg-white px-3 py-1 text-[0.68rem] font-extrabold text-forest shadow-md"
              style={{
                left: index === 0 ? '-2%' : index === 1 ? '70%' : '33%',
                top: index === 2 ? '80%' : '18%',
                animationDelay: `${index * 160}ms`,
              }}
            >
              {item}
            </span>
          ))}
        </div>

        <div className="relative mt-4 grid gap-2 text-left">
          {vi.calculating.steps.map((item, index) => (
            <div key={item} className="flex items-center gap-3 rounded-2xl bg-bg-brand/85 px-3 py-2">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-xs font-extrabold text-forest shadow-sm">
                {index < stage ? '✓' : index === stage ? '•' : index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-extrabold text-forest">{item}</div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white">
                  <div
                    className="h-full rounded-full bg-[linear-gradient(90deg,#29b6a1,#1a4739)] transition-all duration-500"
                    style={{ width: index < stage ? '100%' : index === stage ? `${activePercent}%` : '0%' }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div>
        <div className="mx-auto mb-3 h-1 w-16 rounded-full bg-teal-brand" />
        <h1 className="text-[1.8rem] font-extrabold leading-tight text-forest">
          {vi.calculating.text.replace('[name]', data.name || vi.reflection.fallbackName)}
        </h1>
        <p className="mt-2 min-h-6 text-sm font-semibold text-slate-brand" aria-live="polite">
          {vi.calculating.steps[stage]}
        </p>
      </div>
    </div>
  );
}
