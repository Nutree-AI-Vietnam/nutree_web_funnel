'use client';

import { useRouter } from 'next/navigation';
import { PrimaryButton } from '@/components/primary-button';
import { vi } from '@/lib/copy/vi';
import { nextRoute, type QuizStep } from '@/lib/quiz/steps';

export function PromoStep({
  step,
  headline,
  body,
  emoji,
}: {
  step: QuizStep;
  headline: string;
  body: string;
  emoji: string;
}) {
  const router = useRouter();
  return (
    <div className="flex flex-1 flex-col justify-center gap-6 text-center">
      <div className="text-6xl">{emoji}</div>
      <h1 className="text-3xl font-extrabold text-forest">{headline}</h1>
      <p className="text-lg leading-relaxed text-slate-brand">{body}</p>
      <div className="pt-4">
        <PrimaryButton onClick={() => router.push(nextRoute(step))}>{vi.common.continue}</PrimaryButton>
      </div>
    </div>
  );
}
