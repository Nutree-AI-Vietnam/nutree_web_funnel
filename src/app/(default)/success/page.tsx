'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ConversionShell } from '@/components/conversion-shell';
import { trackStepViewed } from '@/lib/analytics/track';
import { useCopy } from '@/lib/copy/use-copy';
import { useHydrated, useQuizStore } from '@/lib/quiz/store';

export default function SuccessPage() {
  const router = useRouter();
  const vi = useCopy();
  const hydrated = useHydrated();
  const lead = useQuizStore((s) => s.lead);
  const purchased = useQuizStore((s) => s.purchased);
  const locale = useQuizStore((s) => s.locale);

  useEffect(() => trackStepViewed('success'), []);
  useEffect(() => {
    if (hydrated && (!lead || !purchased)) router.replace(`/survey/${locale}`);
  }, [hydrated, lead, locale, purchased, router]);

  if (!hydrated || !lead || !purchased) return null;

  return (
    <ConversionShell className="text-center">
      <div>
        <h1 className="text-3xl font-extrabold leading-tight text-forest">{vi.success.headline}</h1>
        <p className="mt-3 text-slate-brand">{vi.success.body}</p>
      </div>
    </ConversionShell>
  );
}
