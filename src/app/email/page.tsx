'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ConversionShell } from '@/components/conversion-shell';
import { PrimaryButton } from '@/components/primary-button';
import { createLeadFromFirebase } from '@/lib/api/client';
import { trackEvent, trackStepViewed } from '@/lib/analytics/track';
import { useCopy } from '@/lib/copy/use-copy';
import { signInWithGoogle } from '@/lib/firebase/client';
import { useHydrated, useQuizStore } from '@/lib/quiz/store';

export default function EmailPage() {
  const router = useRouter();
  const vi = useCopy();
  const hydrated = useHydrated();
  const setLead = useQuizStore((s) => s.setLead);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canBypassEmail = process.env.NODE_ENV !== 'production';

  useEffect(() => trackStepViewed('email_capture'), []);

  if (!hydrated) return null;

  const signIn = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const identity = await signInWithGoogle();
      const result = await createLeadFromFirebase(identity);
      setLead(result);
      trackEvent('lead_created', { auth_provider: 'google' });
      router.push('/welcome-gift');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : vi.email.error);
      setSubmitting(false);
    }
  };

  const bypassEmailForLocal = () => {
    setLead({
      email: 'local-preview@nutree.dev',
      lead_id: 'lead_local_preview',
      web_user_id: 'web_local_preview',
      masked_email: 'local-preview@nutree.dev',
    });
    trackEvent('email_bypassed_local', {});
    router.push('/welcome-gift');
  };

  return (
    <ConversionShell className="justify-center">
      <section className="rounded-[1.5rem] border border-border-brand bg-white/92 p-5 shadow-[0_18px_55px_rgb(16_39_32_/_0.08)]">
        <div className="flex flex-col gap-4">
          <h1 className="text-3xl font-extrabold leading-tight text-forest">{vi.email.headline}</h1>
          <p className="text-base font-semibold leading-relaxed text-slate-brand">{vi.email.body}</p>
          <p className="text-sm font-medium text-muted-brand">{vi.email.helper}</p>
          {error && (
            <p role="alert" className="text-sm font-bold text-error-brand">
              {error}
            </p>
          )}
          <PrimaryButton disabled={submitting} onClick={signIn}>
            {submitting ? '...' : vi.email.cta}
          </PrimaryButton>
          {canBypassEmail && (
            <button
              type="button"
              onClick={bypassEmailForLocal}
              className="min-h-12 rounded-2xl border border-border-brand bg-white px-4 text-sm font-extrabold text-forest transition hover:bg-mist focus:outline-none focus-visible:ring-4 focus-visible:ring-teal-brand/20 active:scale-[0.98]"
            >
              {vi.email.devBypass}
            </button>
          )}
        </div>
      </section>
    </ConversionShell>
  );
}
