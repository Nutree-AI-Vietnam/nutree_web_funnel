'use client';

import { useRouter } from 'next/navigation';
import { PrimaryButton } from '@/components/primary-button';
import { useCopy } from '@/lib/copy/use-copy';
import { buildReflection } from '@/lib/quiz/reflection';
import { nextRoute } from '@/lib/quiz/steps';
import { useQuizStore } from '@/lib/quiz/store';
import { QuizStepFrame } from './quiz-step-frame';

function findLabel(
  options: ReadonlyArray<{ readonly key: string; readonly label: string }>,
  key?: string,
): string | undefined {
  return options.find((o) => o.key === key)?.label;
}

export function ReflectionStep() {
  const router = useRouter();
  const copy = useCopy();
  const data = useQuizStore((s) => s.data);

  const goalLabel = findLabel(copy.goal.options, data.fitness_goal) ?? copy.reflection.goalFallback;
  const durationLabel = findLabel(copy.duration.options, data.challenge_duration) ?? '-';
  const challengeLabel =
    (data.pain_points ?? []).map((k) => findLabel(copy.challenges.options, k)).find(Boolean) ??
    copy.reflection.challengeFallback;

  const chips = [
    { caption: copy.reflection.goalCaption, value: goalLabel },
    { caption: copy.reflection.challengeCaption, value: challengeLabel },
    { caption: copy.reflection.durationCaption, value: durationLabel },
  ];

  return (
    <QuizStepFrame className="justify-center gap-5">
      <p className="max-w-[22rem] text-[1.5rem] font-extrabold leading-[1.2] tracking-tight text-forest [text-wrap:balance]">
        {buildReflection(data, copy)}
      </p>

      {/* Aha moment: a personalised trajectory that draws itself in */}
      <section className="surface-grain relative overflow-hidden rounded-[1.7rem] bg-white/82 p-4 shadow-[0_16px_46px_rgb(16_39_32_/_0.10),inset_0_1px_0_rgb(255_255_255_/_0.82)] backdrop-blur">
        <div className="absolute -right-8 -top-10 h-28 w-28 rounded-full bg-teal-brand/15 blur-2xl" />
        <div className="relative mb-1 flex items-center justify-between text-[0.72rem] font-extrabold uppercase tracking-[0.12em]">
          <span className="text-muted-brand">{copy.reflection.todayLabel}</span>
          <span className="text-teal-brand">{goalLabel}</span>
        </div>
        <svg viewBox="0 0 320 120" className="relative h-28 w-full" role="img" aria-label={copy.reflection.chartLabel}>
          <defs>
            <linearGradient id="reflect-fill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#1fa892" stopOpacity="0.24" />
              <stop offset="100%" stopColor="#1fa892" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="reflect-stroke" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0%" stopColor="#17453a" />
              <stop offset="100%" stopColor="#34d0b4" />
            </linearGradient>
          </defs>
          {/* baseline */}
          <path d="M16 104h288" stroke="#d4e5de" strokeWidth="2" strokeLinecap="round" />
          {/* area under curve */}
          <path
            className="reflect-fade"
            d="M20 100 C 96 96, 150 74, 210 50 C 252 34, 280 26, 300 22 L300 104 L20 104 Z"
            fill="url(#reflect-fill)"
          />
          {/* rising trajectory */}
          <path
            className="reflect-line"
            d="M20 100 C 96 96, 150 74, 210 50 C 252 34, 280 26, 300 22"
            fill="none"
            stroke="url(#reflect-stroke)"
            strokeWidth="5"
            strokeLinecap="round"
          />
          {/* start marker */}
          <circle cx="20" cy="100" r="4.5" fill="#17453a" />
          {/* goal marker */}
          <circle className="promise-dot" cx="300" cy="22" r="7" fill="#1fa892" />
          <circle className="promise-dot" cx="300" cy="22" r="12" fill="none" stroke="#1fa892" strokeOpacity="0.35" strokeWidth="2" />
        </svg>
        <p className="reflect-fade relative mt-1 text-center text-xs font-semibold text-muted-brand">
          {copy.reflection.caption}
        </p>
      </section>

      <div className="grid grid-cols-3 gap-2">
        {chips.map((chip) => (
          <div
            key={chip.caption}
            className="flex min-h-[4.25rem] flex-col rounded-2xl bg-white/72 px-2.5 py-2.5 text-center shadow-[inset_0_0_0_1px_rgb(255_255_255_/_0.5),0_2px_8px_rgb(16_39_32_/_0.05)] backdrop-blur"
          >
            <div className="text-[0.58rem] font-bold uppercase tracking-wide text-muted-brand">{chip.caption}</div>
            <div className="mt-1 flex flex-1 items-center justify-center text-[0.78rem] font-extrabold leading-tight text-forest [text-wrap:balance]">
              {chip.value}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-auto">
        <PrimaryButton onClick={() => router.push(nextRoute('reflection'))}>
          {copy.common.continue}
        </PrimaryButton>
      </div>
    </QuizStepFrame>
  );
}
