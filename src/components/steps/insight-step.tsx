'use client';

import { useRouter } from 'next/navigation';
import { PrimaryButton } from '@/components/primary-button';
import { Icon, type IconName } from '@/components/ui/icons';
import { useCopy } from '@/lib/copy/use-copy';
import { goToNextQuizStep } from '@/lib/quiz/navigation';
import { useQuizStore } from '@/lib/quiz/store';
import type { QuizStep } from '@/lib/quiz/steps';
import { ILLUSTRATION_CAPTION } from '@/lib/quiz/vi-survey';
import { Art } from './vi-art';
import { QuizStepFrame } from './quiz-step-frame';

export const INSIGHT_STEPS = [
  'insight_pace',
  'insight_body',
  'insight_why',
  'insight_movement',
  'insight_obstacle',
  'insight_habits',
] as const;

export type InsightStepId = (typeof INSIGHT_STEPS)[number];

const ICONS: Record<InsightStepId, IconName> = {
  insight_pace: 'calendar',
  insight_body: 'bowl',
  insight_why: 'flame',
  insight_movement: 'bolt',
  insight_obstacle: 'shield',
  insight_habits: 'chat',
};

function answerKey(step: InsightStepId, jobType: string | undefined, answers: Partial<Record<string, string>> | undefined): string | undefined {
  if (step === 'insight_why') return answers?.aim;
  if (step === 'insight_obstacle') return answers?.obstacle;
  if (step === 'insight_habits') return answers?.trigger;
  if (step === 'insight_movement') return jobType;
  return undefined;
}

/** A short coaching screen between questions. Nothing new is saved. */
export function InsightStep({ step }: { step: InsightStepId }) {
  const copy = useCopy();
  const router = useRouter();
  const block = copy.insights[step];
  const jobType = useQuizStore((state) => state.data.job_type);
  const answers = useQuizStore((state) => state.planAnswers.answers);
  const picked = answerKey(step, jobType, answers);
  const variants = block.byAnswer as Record<string, string>;
  const body = (picked && variants[picked]) || block.body || variants.fallback;

  return (
    <QuizStepFrame pinTop>
      <div className="flex flex-col gap-4">
        {step === 'insight_pace' && (
          <div className="flex flex-col items-center gap-2">
            <Art id="twoLines" />
            <p className="text-center text-[0.78rem] font-semibold text-muted-brand">{ILLUSTRATION_CAPTION}</p>
          </div>
        )}
        <div className="flex items-center gap-3">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-mist text-teal-brand">
            <Icon name={ICONS[step]} className="h-6 w-6" />
          </span>
          <p className="text-[0.75rem] font-extrabold uppercase tracking-[0.08em] text-teal-brand">{block.eyebrow}</p>
        </div>
        <h1 className="text-[1.55rem] font-extrabold leading-[1.2] tracking-[-0.03em] text-forest">{block.title}</h1>
        <p className="text-[1.02rem] font-semibold leading-relaxed text-slate-brand">{body}</p>
        {block.points.length > 0 && (
          <ul className="flex flex-col gap-2.5 rounded-[1.4rem] bg-white px-4 py-4 shadow-[0_6px_16px_rgb(23_69_58_/_0.06)]">
            {block.points.map((point) => (
              <li key={point} className="flex items-start gap-2.5 text-[0.95rem] font-semibold leading-snug text-forest">
                <span aria-hidden="true" className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-teal-brand/15 text-[0.7rem] font-black text-teal-brand">✓</span>
                <span>{point}</span>
              </li>
            ))}
          </ul>
        )}
        {block.note ? <p className="text-[0.78rem] font-semibold leading-relaxed text-muted-brand">{block.note}</p> : null}
      </div>
      <div className="mt-auto pt-3">
        <PrimaryButton onClick={() => goToNextQuizStep(router, step as QuizStep)}>{block.cta}</PrimaryButton>
      </div>
    </QuizStepFrame>
  );
}

export function isInsightStep(step: QuizStep): step is 'insight_pace' {
  return step === 'insight_pace';
}
