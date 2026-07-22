'use client';

import { useRouter } from 'next/navigation';
import { PrimaryButton } from '@/components/primary-button';
import { vi } from '@/lib/copy/vi';
import { buildReflection } from '@/lib/quiz/reflection';
import { nextRoute } from '@/lib/quiz/steps';
import { useQuizStore } from '@/lib/quiz/store';
import { QuizStepFrame } from './quiz-step-frame';

export function ReflectionStep() {
  const router = useRouter();
  const data = useQuizStore((s) => s.data);

  return (
    <QuizStepFrame className="justify-center gap-5">
      <section className="relative overflow-hidden rounded-[2rem] border border-white/80 bg-white/86 p-5 shadow-[0_26px_80px_rgb(26_71_57_/_0.14)] backdrop-blur">
        <div className="absolute -right-10 -top-12 h-32 w-32 rounded-full bg-teal-brand/15 blur-2xl" />
        <div className="relative mb-4 h-1 w-16 rounded-full bg-teal-brand" />
        <p className="relative text-[1.7rem] font-extrabold leading-tight text-forest">{buildReflection(data)}</p>
        <div className="relative mt-5 grid grid-cols-3 gap-2">
          {['Mục tiêu', 'Khó khăn', 'Thời gian'].map((item) => (
            <div key={item} className="rounded-2xl bg-bg-brand px-3 py-2 text-center text-[0.68rem] font-extrabold text-slate-brand">
              {item}
            </div>
          ))}
        </div>
      </section>
      <div className="mt-auto">
        <PrimaryButton onClick={() => router.push(nextRoute('reflection'))}>
          {vi.common.continue}
        </PrimaryButton>
      </div>
    </QuizStepFrame>
  );
}
