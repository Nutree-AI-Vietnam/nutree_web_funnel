'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { PrimaryButton } from '@/components/primary-button';
import { StoreLaurels } from '@/components/value-tour/value-tour-demos';
import { useCopy, useLocale } from '@/lib/copy/use-copy';
import { InsightStep } from './insight-step';
import { goToNextQuizStep } from '@/lib/quiz/navigation';
import { useQuizStore } from '@/lib/quiz/store';
import type { QuizStep } from '@/lib/quiz/steps';
import { QuizStepFrame } from './quiz-step-frame';

/** Social-proof beat. The count is Nutree's real customer figure. */
export function ProofStep({ step }: { step: Extract<QuizStep, 'proof' | 'cohort'> }) {
  const copy = useCopy();
  const locale = useLocale();
  const router = useRouter();
  const data = useQuizStore((state) => state.data);
  if (locale !== 'en' && step === 'proof') return <InsightStep step="insight_pace" />;
  const block = copy[step];
  const sex = copy.sex.options.find((option) => option.key === data.gender)?.label;
  const age = copy.ageGroup.options.find((option) => option.key === data.age_group)?.label;
  const goal = copy.goal.options.find((option) => option.key === data.fitness_goal)?.label;
  const who = [sex, age].filter(Boolean).join(' ');
  const cohortLine = who && goal ? block.line(who, goal) : block.fallback;

  if (step === 'proof') {
    const proof = copy.proof;
    const photo = data.gender === 'male' ? '/images/proof-male.jpg' : '/images/proof-female.jpg';
    const group = data.gender === 'male' ? proof.groupMale : data.gender === 'female' ? proof.groupFemale : proof.groupFallback;
    return (
      <QuizStepFrame pinTop>
        <div className="flex flex-col items-center pt-1 text-center">
          <h1 className="text-[1.35rem] font-extrabold leading-[1.2] tracking-[-0.03em]">
            <span className="text-teal-brand">{proof.count} {proof.audience}</span>
            <br />
            <span className="text-[#171717]">{proof.title}</span>
          </h1>
          <div className="mt-5 w-full overflow-hidden rounded-[1.6rem]">
            <Image src={photo} alt={proof.photoAlt} width={1024} height={682} priority className="aspect-[3/2] w-full object-cover object-center" />
          </div>
          <p className="mt-4 max-w-[16.5rem] text-[0.92rem] font-bold leading-[1.45] text-[#3d6d62]">
            <span className="box-decoration-clone bg-[#d7f3ea] px-1.5 py-0.5 [box-decoration-break:clone]">{proof.recommend(group)}</span>
          </p>
          <StoreLaurels className="mt-5 w-full" />
        </div>
        <div className="mt-auto pt-3">
          <PrimaryButton onClick={() => goToNextQuizStep(router, step)}>{proof.cta}</PrimaryButton>
        </div>
      </QuizStepFrame>
    );
  }

  return (
    <QuizStepFrame className="justify-center gap-6">
      <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
        <h1 className="max-w-[18rem] text-[1.55rem] font-extrabold leading-tight text-forest">{block.title}</h1>
        <p className="text-[3.4rem] font-extrabold leading-none tracking-tight text-forest">{block.count}</p>
        <p className="max-w-[20rem] text-[1.02rem] font-semibold leading-relaxed text-muted-brand">{cohortLine}</p>
      </div>
      <div className="mt-auto">
        <PrimaryButton onClick={() => goToNextQuizStep(router, step)}>{block.cta}</PrimaryButton>
      </div>
    </QuizStepFrame>
  );
}
