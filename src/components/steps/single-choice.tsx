'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { OptionCard } from '@/components/option-card';
import { goToNextQuizStep } from '@/lib/quiz/navigation';
import type { QuizStep } from '@/lib/quiz/steps';
import { useCopy } from '@/lib/copy/use-copy';
import { useQuizStore, type DeviceOS } from '@/lib/quiz/store';
import type { OnboardingPayload } from '@/lib/quiz/types';
import { QuizStepFrame } from './quiz-step-frame';

export function SingleChoiceStep<K extends keyof OnboardingPayload>({
  step,
  field,
  question,
  options,
}: {
  step: QuizStep;
  field: K;
  question: string;
  options: ReadonlyArray<{ readonly key: string; readonly label: string; readonly icon?: string }>;
}) {
  const router = useRouter();
  const value = useQuizStore((s) => s.data[field]);
  const setData = useQuizStore((s) => s.setData);
  // Show the selection, then advance so feedback lands before navigation.
  const [pending, setPending] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const choose = (key: string) => {
    if (pending) return;
    setData({ [field]: key } as Partial<OnboardingPayload>);
    setPending(key);
    timerRef.current = setTimeout(() => goToNextQuizStep(router, step), 240);
  };

  return (
    <QuizStepFrame title={question} className="gap-3">
      {options.map((o) => (
        <OptionCard
          key={o.key}
          label={o.label}
          icon={o.icon}
          selected={pending ? pending === o.key : value === o.key}
          onClick={() => choose(o.key)}
        />
      ))}
    </QuizStepFrame>
  );
}

export function OperatingSystemStep() {
  const router = useRouter();
  const copy = useCopy().operatingSystem;
  const deviceOS = useQuizStore((s) => s.deviceOS);
  const resumeAfterOS = useQuizStore((s) => s.resumeAfterOS);
  const setDeviceOS = useQuizStore((s) => s.setDeviceOS);
  const setCurrentStep = useQuizStore((s) => s.setCurrentStep);
  const setFunnelScreen = useQuizStore((s) => s.setFunnelScreen);
  const setResumeAfterOS = useQuizStore((s) => s.setResumeAfterOS);
  const [pending, setPending] = useState<DeviceOS | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const options: ReadonlyArray<{ key: DeviceOS; label: string }> = [
    { key: 'android', label: copy.android },
    { key: 'ios', label: copy.ios },
  ];

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const choose = (os: DeviceOS) => {
    if (pending) return;
    setDeviceOS(os);
    setPending(os);
    timerRef.current = setTimeout(() => {
      if (os === 'android') {
        setFunnelScreen('android-filter');
      } else if (resumeAfterOS) {
        setResumeAfterOS(null);
        if (resumeAfterOS.screen === 'quiz') {
          setCurrentStep(resumeAfterOS.step);
          setFunnelScreen('quiz');
        } else {
          setFunnelScreen('email');
        }
      } else {
        goToNextQuizStep(router, 'operating_system');
      }
    }, 240);
  };

  return (
    <QuizStepFrame title={copy.question} className="gap-3">
      {options.map((option) => (
        <OptionCard
          key={option.key}
          label={option.label}
          selected={pending ? pending === option.key : deviceOS === option.key}
          onClick={() => choose(option.key)}
        />
      ))}
    </QuizStepFrame>
  );
}
