import { notFound } from 'next/navigation';
import { QuizShell } from '@/components/quiz-shell';
import { isQuizStep, QUIZ_STEPS } from '@/lib/quiz/steps';
import { StepRenderer } from './step-renderer';

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
