'use client';

import { useRouter } from 'next/navigation';
import { useCopy } from '@/lib/copy/use-copy';
import { birthFromAgeGroup, isAgeGroup, type AgeGroup } from '@/lib/quiz/age-band';
import { goToNextQuizStep } from '@/lib/quiz/navigation';
import { useQuizStore } from '@/lib/quiz/store';
import { ImageChoice } from './image-choice';

const AGE_IMAGES: Record<'male' | 'female', Record<AgeGroup, string>> = {
  female: {
    '18_29': '/images/illustrations/age-18-29-f.jpg',
    '30_39': '/images/illustrations/age-30-39.jpg',
    '40_49': '/images/illustrations/age-40-49-f.jpg',
    '50_plus': '/images/illustrations/age-50-plus.jpg',
  },
  male: {
    '18_29': '/images/illustrations/age-18-29.jpg',
    '30_39': '/images/illustrations/age-30-39-m.jpg',
    '40_49': '/images/illustrations/age-40-49.jpg',
    '50_plus': '/images/illustrations/age-50-plus-m.jpg',
  },
};

/** One tap picks the band and the age the calorie math will use. */
export function AgeGroupStep() {
  const copy = useCopy();
  const router = useRouter();
  const gender = useQuizStore((state) => state.data.gender);
  const setData = useQuizStore((state) => state.setData);
  const images = AGE_IMAGES[gender === 'male' ? 'male' : 'female'];

  return (
    <ImageChoice
      title={copy.ageGroup.question}
      options={copy.ageGroup.options.flatMap((option) => {
        if (!isAgeGroup(option.key)) return [];
        const group: AgeGroup = option.key;
        return [{ key: group, label: option.label, image: images[group] }];
      })}
      onChoose={(key) => {
        if (!isAgeGroup(key)) return;
        setData({ age_group: key, ...birthFromAgeGroup(key) });
        goToNextQuizStep(router, 'age_group');
      }}
    />
  );
}
