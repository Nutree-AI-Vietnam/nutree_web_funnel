'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PrimaryButton } from '@/components/primary-button';
import { BackgroundBeams } from '@/components/ui/background-beams';
import { GlowingCard } from '@/components/ui/glowing-card';
import { createLead } from '@/lib/api/client';
import { trackEvent, trackStepViewed } from '@/lib/analytics/track';
import { vi } from '@/lib/copy/vi';
import { isValidEmail } from '@/lib/quiz/email';
import { useHydrated, useQuizStore } from '@/lib/quiz/store';

export default function EmailPage() {
  const router = useRouter();
  const hydrated = useHydrated();
  const data = useQuizStore((s) => s.data);
  const lead = useQuizStore((s) => s.lead);
  const setLead = useQuizStore((s) => s.setLead);
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => trackStepViewed('email_capture'), []);
  const currentEmail = email || lead?.email || '';

  if (!hydrated) return null;

  const submit = async () => {
    if (!isValidEmail(currentEmail)) {
      setError(vi.email.invalid);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const result = await createLead(currentEmail.trim(), data);
      setLead(result);
      trackEvent('lead_created', {});
      router.push('/paywall');
    } catch {
      setError(vi.email.error);
      setSubmitting(false);
    }
  };

  return (
    <main className="relative mx-auto flex min-h-dvh w-full max-w-lg flex-col justify-center gap-4 overflow-hidden px-5 py-8">
      <BackgroundBeams />
      <div className="relative z-10 animate-soft-enter">
        <GlowingCard className="rounded-3xl">
          <div className="flex flex-col gap-4 p-5">
            <h1 className="text-3xl font-extrabold leading-tight text-forest">{vi.email.headline}</h1>
            <p className="text-slate-brand">{vi.email.body}</p>
            <input
              type="email"
              inputMode="email"
              autoComplete="email"
              value={currentEmail}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && void submit()}
              placeholder={vi.email.placeholder}
              className="rounded-2xl border-2 border-border-brand bg-white/90 px-5 py-4 text-lg outline-none transition focus:border-teal-brand focus:ring-4 focus:ring-teal-brand/10"
            />
            {error && <p className="text-sm font-medium text-error-brand">{error}</p>}
            <PrimaryButton disabled={submitting || !currentEmail} onClick={submit}>
              {submitting ? '...' : vi.email.cta}
            </PrimaryButton>
          </div>
        </GlowingCard>
      </div>
    </main>
  );
}
