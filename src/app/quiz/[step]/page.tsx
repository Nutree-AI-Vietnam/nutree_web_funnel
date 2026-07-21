import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { QuizShell } from '@/components/quiz-shell';
import { isQuizStep, QUIZ_STEPS } from '@/lib/quiz/steps';
import { StepRenderer } from './step-renderer';

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export function generateStaticParams() {
  return QUIZ_STEPS.map((step) => ({ step }));
}

export default async function QuizStepPage({ params }: { params: Promise<{ step: string }> }) {
  const { step } = await params;
  if (!isQuizStep(step)) notFound();

  return (
    <QuizShell step={step}>
      <StepRenderer step={step} />
    </QuizShell>
  );
}
