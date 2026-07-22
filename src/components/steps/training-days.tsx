'use client';

import { useRouter } from 'next/navigation';
import { vi } from '@/lib/copy/vi';
import { nextRoute } from '@/lib/quiz/steps';
import { useQuizStore } from '@/lib/quiz/store';
import { cn } from '@/lib/utils';
import { QuizStepFrame } from './quiz-step-frame';

const optionClass = (selected: boolean) =>
  `rounded-2xl border shadow-sm backdrop-blur transition duration-300 focus:outline-none focus:ring-4 focus:ring-teal-brand/15 active:scale-[0.99] ${
    selected
      ? 'border-teal-brand/75 bg-mist/90 text-forest ring-2 ring-teal-brand/15'
      : 'border-white/75 bg-white/82 text-charcoal hover:-translate-y-0.5 hover:border-teal-brand/50 hover:bg-white'
  }`;

export function TrainingDaysStep() {
  const router = useRouter();
  const value = useQuizStore((s) => s.data.training_days_per_week);
  const setData = useQuizStore((s) => s.setData);

  return (
    <QuizStepFrame title={vi.training_days.question}>
      <div className="grid grid-cols-4 gap-2.5">
        {[0, 1, 2, 3, 4, 5, 6, 7].map((d) => (
          <button
            key={d}
            type="button"
            aria-pressed={value === d}
            onClick={() => {
              setData({ training_days_per_week: d });
              router.push(d === 0 ? '/quiz/eating_pattern' : nextRoute('training_days'));
            }}
            className={`${optionClass(value === d)} relative min-h-14 py-4 text-xl font-extrabold`}
          >
            {d}
            {value === d && (
              <span
                aria-hidden="true"
                className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-teal-brand text-xs text-white"
              >
                ✓
              </span>
            )}
          </button>
        ))}
      </div>
      <p className="rounded-2xl bg-white/70 px-4 py-3 text-center text-sm font-semibold text-muted-brand shadow-sm backdrop-blur">
        {vi.training_days.unit}
      </p>
    </QuizStepFrame>
  );
}

export function TrainingDurationStep({
  question,
  options,
}: {
  question: string;
  options: ReadonlyArray<{ readonly key: string; readonly label: string }>;
}) {
  const router = useRouter();
  const value = useQuizStore((s) => s.data.training_minutes_per_session);
  const setData = useQuizStore((s) => s.setData);

  return (
    <QuizStepFrame title={question} className="gap-3">
      {options.map((o) => (
        <button
          key={o.key}
          type="button"
          aria-pressed={value === Number(o.key)}
          onClick={() => {
            setData({ training_minutes_per_session: Number(o.key) });
            router.push(nextRoute('training_duration'));
          }}
          className={cn(
            optionClass(value === Number(o.key)),
            'flex min-h-12 w-full items-center justify-between gap-3 px-5 py-4 text-left text-base font-semibold',
          )}
        >
          <span>{o.label}</span>
          <span
            aria-hidden="true"
            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-sm transition duration-300 ${
              value === Number(o.key)
                ? 'bg-teal-brand text-white shadow-[0_8px_18px_rgb(41_182_161_/_0.30)]'
                : 'scale-75 bg-transparent text-transparent opacity-0'
            }`}
          >
            ✓
          </span>
        </button>
      ))}
    </QuizStepFrame>
  );
}
