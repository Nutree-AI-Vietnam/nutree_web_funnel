import { nextStep, type QuizStep } from './steps';

type OperatingSystemResume =
  | { screen: 'quiz'; step: QuizStep }
  | { screen: 'email' };

/** Same next screen for Android and iOS after the phone question. */
export function continuationAfterOperatingSystem(
  resume: OperatingSystemResume | null,
): { screen: 'quiz'; step: QuizStep } | { screen: 'email' } {
  if (resume?.screen === 'email') return { screen: 'email' };
  if (resume?.screen === 'quiz' && resume.step !== 'operating_system') {
    return { screen: 'quiz', step: resume.step };
  }
  const next = nextStep('operating_system');
  return { screen: 'quiz', step: next ?? 'goal' };
}
