'use client';

import { motion, useReducedMotion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { OptionCard } from '@/components/option-card';
import { PrimaryButton } from '@/components/primary-button';
import { useCopy } from '@/lib/copy/use-copy';
import { goToNextQuizStep } from '@/lib/quiz/navigation';
import { useQuizStore } from '@/lib/quiz/store';
import { QuizStepFrame } from './quiz-step-frame';

type StoryKey = 'aim' | 'tried' | 'obstacle' | 'occasion' | 'diet_style' | 'weekend' | 'trigger';
type BeatKey = 'with_you';

/** One tap question. The answer stays in the browser; calories do not use it. */
export function StoryStep({ step }: { step: StoryKey }) {
  const copy = useCopy();
  const router = useRouter();
  const block = copy.story[step];
  const setPlanAnswers = useQuizStore((state) => state.setPlanAnswers);
  const [pending, setPending] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const choose = (key: string) => {
    if (pending) return;
    const answers = useQuizStore.getState().planAnswers.answers;
    setPlanAnswers({ answers: { ...answers, [step]: key } });
    setPending(key);
    timerRef.current = setTimeout(() => goToNextQuizStep(router, step), 0);
  };

  return (
    <QuizStepFrame title={block.question} className="gap-3">
      <div className="flex flex-col gap-2.5">
        {block.options.map((option) => (
          <OptionCard
            key={option.key}
            label={option.label}
            plain
            large
            selected={pending === option.key}
            onClick={() => choose(option.key)}
          />
        ))}
      </div>
    </QuizStepFrame>
  );
}

/** A pause between question clusters. Nothing to answer. */
export function BeatStep({ step }: { step: BeatKey }) {
  const copy = useCopy();
  const router = useRouter();
  const reduce = useReducedMotion();
  const block = copy.story[step];
  return (
    <QuizStepFrame className="justify-center">
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-2 text-center">
        {step === 'with_you' && (
          <span className="relative grid h-36 w-36 place-items-center">
            {!reduce && (
              <motion.span
                aria-hidden="true"
                className="absolute inset-2 rounded-full bg-[#e26b7a]/15"
                animate={{ scale: [0.85, 1.18, 0.85], opacity: [0.55, 0, 0.55] }}
                transition={{ duration: 1.6, repeat: Infinity, ease: 'easeOut' }}
              />
            )}
            <motion.svg
              viewBox="0 0 24 24"
              className="relative h-28 w-28 text-[#e26b7a] drop-shadow-[0_12px_24px_rgb(226_107_122_/_0.35)]"
              aria-hidden="true"
              animate={reduce ? undefined : { scale: [1, 1.08, 1, 1.05, 1] }}
              transition={reduce ? undefined : { duration: 1.15, repeat: Infinity, ease: 'easeInOut', times: [0, 0.16, 0.32, 0.48, 1] }}
            >
              <path fill="currentColor" d="M12 20.2s-6.8-4.2-9.2-8.1C1.2 9.6 2.1 6.4 5 5.3c1.8-.7 3.6 0 4.7 1.5L12 9l2.3-2.2c1.1-1.5 2.9-2.2 4.7-1.5 2.9 1.1 3.8 4.3 2.2 6.8-2.4 3.9-9.2 8.1-9.2 8.1Z" />
            </motion.svg>
          </span>
        )}
        <h1 className="max-w-[18rem] text-[1.4rem] font-extrabold leading-tight text-forest">{block.title}</h1>
        <p className="max-w-[20rem] text-[0.95rem] font-semibold leading-relaxed text-slate-brand">{block.body}</p>
      </div>
      <div className="mt-auto">
        <PrimaryButton onClick={() => goToNextQuizStep(router, step)}>{block.cta}</PrimaryButton>
      </div>
    </QuizStepFrame>
  );
}
