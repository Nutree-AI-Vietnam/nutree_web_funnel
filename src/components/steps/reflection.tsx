'use client';

import { useRouter } from 'next/navigation';
import { PrimaryButton } from '@/components/primary-button';
import { vi } from '@/lib/copy/vi';
import { buildReflection } from '@/lib/quiz/reflection';
import { nextRoute } from '@/lib/quiz/steps';
import { useQuizStore } from '@/lib/quiz/store';

export function ReflectionStep() {
  const router = useRouter();
  const data = useQuizStore((s) => s.data);

  return (
    <div className="flex flex-1 flex-col justify-center gap-8 text-center">
      <p className="text-2xl font-semibold leading-relaxed text-forest">{buildReflection(data)}</p>
      <PrimaryButton onClick={() => router.push(nextRoute('reflection'))}>
        {vi.common.continue}
      </PrimaryButton>
    </div>
  );
}
