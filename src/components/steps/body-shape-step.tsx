'use client';

import { useRouter } from 'next/navigation';
import { useCopy } from '@/lib/copy/use-copy';
import { goToNextQuizStep } from '@/lib/quiz/navigation';
import { useQuizStore } from '@/lib/quiz/store';
import type { QuizStep } from '@/lib/quiz/steps';
import type { OnboardingPayload } from '@/lib/quiz/types';
import { ImageChoice } from './image-choice';

type Gender = 'male' | 'female';
type CurrentShape = NonNullable<OnboardingPayload['body_current']>;
type TargetShape = NonNullable<OnboardingPayload['body_target']>;

const CURRENT_IMAGES: Record<Gender, Record<CurrentShape, string>> = {
  female: {
    slim: '/images/illustrations/body-f-slim.jpg',
    average: '/images/illustrations/body-f-average.jpg',
    fuller: '/images/illustrations/body-f-fuller.jpg',
  },
  male: {
    slim: '/images/illustrations/body-m-slim.jpg',
    average: '/images/illustrations/body-m-average.jpg',
    fuller: '/images/illustrations/body-m-fuller.jpg',
  },
};

const TARGET_IMAGES: Record<Gender, Record<TargetShape, string>> = {
  female: {
    lean: '/images/illustrations/body-f-slim.jpg',
    toned: '/images/illustrations/body-f-average.jpg',
    athletic: '/images/illustrations/body-f-athletic.jpg',
  },
  male: {
    lean: '/images/illustrations/body-m-slim.jpg',
    toned: '/images/illustrations/body-m-average.jpg',
    athletic: '/images/illustrations/body-m-athletic.jpg',
  },
};

/** Body cards follow the sex answer, the same way the age cards do. */
export function BodyShapeStep({ kind }: { kind: 'current' | 'target' }) {
  const copy = useCopy();
  const router = useRouter();
  const gender = useQuizStore((state) => state.data.gender);
  const setData = useQuizStore((state) => state.setData);
  const side: Gender = gender === 'male' ? 'male' : 'female';
  const block = kind === 'current' ? copy.bodyCurrent : copy.bodyTarget;
  const step: QuizStep = kind === 'current' ? 'body_current' : 'body_target';
  const options = kind === 'current'
    ? copy.bodyCurrent.options.map((option) => ({
        key: option.key,
        label: option.label,
        image: CURRENT_IMAGES[side][option.key as CurrentShape],
      }))
    : copy.bodyTarget.options.map((option) => ({
        key: option.key,
        label: option.label,
        image: TARGET_IMAGES[side][option.key as TargetShape],
      }));

  return (
    <ImageChoice
      title={block.question}
      columns={3}
      fit="cover"
      options={options}
      onChoose={(key) => {
        setData(kind === 'current' ? { body_current: key as CurrentShape } : { body_target: key as TargetShape });
        goToNextQuizStep(router, step);
      }}
    />
  );
}
