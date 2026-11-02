'use client';

import { useRouter } from 'next/navigation';
import { useCopy } from '@/lib/copy/use-copy';
import { goToNextQuizStep } from '@/lib/quiz/navigation';
import { useQuizStore } from '@/lib/quiz/store';
import { ImageChoice } from './image-choice';

const SEX_IMAGES = {
  male: '/images/illustrations/age-18-29.jpg',
  female: '/images/illustrations/age-30-39.jpg',
} as const;

export function SexStep() {
  const copy = useCopy();
  const router = useRouter();
  const setData = useQuizStore((state) => state.setData);

  return (
    <ImageChoice
      title={copy.sex.question}
      hint={copy.sex.description}
      options={copy.sex.options.map((option) => ({
        key: option.key,
        label: option.label,
        image: option.key === 'male' ? SEX_IMAGES.male : SEX_IMAGES.female,
      }))}
      onChoose={(key) => {
        setData({ gender: key as 'male' | 'female' });
        goToNextQuizStep(router, 'sex');
      }}
    />
  );
}
