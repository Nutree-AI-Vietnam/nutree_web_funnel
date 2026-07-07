'use client';

import { useRouter } from 'next/navigation';
import { vi } from '@/lib/copy/vi';
import { nextRoute } from '@/lib/quiz/steps';
import { useQuizStore } from '@/lib/quiz/store';

const optionClass = (selected: boolean) =>
  `rounded-2xl border-2 transition ${
    selected
      ? 'border-teal-brand bg-mist text-forest'
      : 'border-border-brand bg-white text-charcoal hover:border-teal-brand/50'
  }`;

export function TrainingDaysStep() {
  const router = useRouter();
  const value = useQuizStore((s) => s.data.training_days_per_week);
  const setData = useQuizStore((s) => s.setData);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold text-forest">{vi.training_days.question}</h1>
      <div className="grid grid-cols-4 gap-3">
        {[0, 1, 2, 3, 4, 5, 6, 7].map((d) => (
          <button
            key={d}
            type="button"
            aria-pressed={value === d}
            onClick={() => {
              setData({ training_days_per_week: d });
              router.push(nextRoute('training_days'));
            }}
            className={`${optionClass(value === d)} py-4 text-xl font-bold`}
          >
            {d}
          </button>
        ))}
      </div>
      <p className="text-center text-sm text-muted-brand">{vi.training_days.unit}</p>
    </div>
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
    <div className="flex flex-col gap-3">
      <h1 className="mb-4 text-2xl font-bold text-forest">{question}</h1>
      {options.map((o) => (
        <button
          key={o.key}
          type="button"
          aria-pressed={value === Number(o.key)}
          onClick={() => {
            setData({ training_minutes_per_session: Number(o.key) });
            router.push(nextRoute('training_duration'));
          }}
          className={`${optionClass(value === Number(o.key))} w-full px-5 py-4 text-left text-base font-medium`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
