'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { QuizStepFrame } from './quiz-step-frame';

export interface ImageChoiceOption {
  key: string;
  label: string;
  image: string;
}

/** Tap-to-advance cards. Used for sex, age, and body shape. */
export function ImageChoice({
  title,
  hint,
  options,
  columns = 2,
  fit = 'cover',
  onChoose,
}: {
  title: string;
  hint?: string;
  options: readonly ImageChoiceOption[];
  columns?: 1 | 2 | 3;
  fit?: 'cover' | 'contain';
  onChoose: (key: string) => void;
}) {
  const [pending, setPending] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const choose = (key: string) => {
    if (pending) return;
    setPending(key);
    timerRef.current = setTimeout(() => onChoose(key), 240);
  };

  return (
    <QuizStepFrame title={title} hint={hint} className="gap-3">
      <div className={cn('grid gap-2', columns === 3 ? 'grid-cols-3' : columns === 2 ? 'grid-cols-2' : 'grid-cols-1')}>
        {options.map((option) => {
          const selected = pending === option.key;
          return (
            <button
              key={option.key}
              type="button"
              aria-pressed={selected}
              onClick={() => choose(option.key)}
              className={cn(
                'overflow-hidden rounded-[1.4rem] bg-white text-center shadow-[inset_0_0_0_1px_rgb(16_39_32_/_0.08),0_8px_18px_rgb(23_69_58_/_0.08)] transition focus:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-teal-brand/25 active:scale-[0.98]',
                selected && 'shadow-[inset_0_0_0_2px_#17453a,0_8px_18px_rgb(23_69_58_/_0.08)]',
              )}
            >
              <Image
                src={option.image}
                alt=""
                width={320}
                height={420}
                className={cn(
                  'block w-full object-cover object-center',
                  columns === 3 ? 'aspect-[3/4]' : 'aspect-square',
                  fit === 'contain' && 'object-contain bg-mist',
                )}
              />
              <span className={cn('block px-1 font-medium text-forest', columns === 3 ? 'py-2 text-[0.95rem]' : 'px-2 py-3 text-[1.05rem]')}>{option.label}</span>
            </button>
          );
        })}
      </div>
    </QuizStepFrame>
  );
}
