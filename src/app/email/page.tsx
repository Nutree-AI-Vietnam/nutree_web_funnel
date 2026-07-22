'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ConversionShell } from '@/components/conversion-shell';
import { PrimaryButton } from '@/components/primary-button';
import { GlowingCard } from '@/components/ui/glowing-card';
import { createLead } from '@/lib/api/client';
import { trackEvent, trackStepViewed } from '@/lib/analytics/track';
import { useCopy } from '@/lib/copy/use-copy';
import { isValidEmail } from '@/lib/quiz/email';
import { useHydrated, useQuizStore } from '@/lib/quiz/store';

export default function EmailPage() {
  const router = useRouter();
  const vi = useCopy();
  const hydrated = useHydrated();
  const data = useQuizStore((s) => s.data);
  const lead = useQuizStore((s) => s.lead);
  const setLead = useQuizStore((s) => s.setLead);
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => trackStepViewed('email_capture'), []);
  const currentEmail = email || lead?.email || '';

  if (!hydrated) return null;

  const submit = async () => {
    if (!isValidEmail(currentEmail)) {
      setError(vi.email.invalid);
      inputRef.current?.focus();
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
    <ConversionShell>
        <GlowingCard className="rounded-3xl">
          <div className="flex flex-col gap-4 p-5">
            <h1 className="text-3xl font-extrabold leading-tight text-forest">{vi.email.headline}</h1>
            <p className="text-slate-brand">{vi.email.body}</p>
            <label htmlFor="email" className="sr-only">
              {vi.email.placeholder}
            </label>
            <input
              ref={inputRef}
              id="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              value={currentEmail}
              onChange={(e) => {
                setEmail(e.target.value);
                if (error) setError(null);
              }}
              onKeyDown={(e) => e.key === 'Enter' && void submit()}
              placeholder={vi.email.placeholder}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? 'email-error' : undefined}
              className="rounded-2xl border border-white/80 bg-bg-brand/90 px-5 py-4 text-lg font-semibold text-forest shadow-inner outline-none transition placeholder:text-muted-brand/65 focus:border-teal-brand focus:ring-4 focus:ring-teal-brand/10 aria-[invalid=true]:border-error-brand aria-[invalid=true]:focus:ring-error-brand/15"
            />
            {error && (
              <p id="email-error" role="alert" className="text-sm font-medium text-error-brand">
                {error}
              </p>
            )}
            <PrimaryButton disabled={submitting || !currentEmail} onClick={submit}>
              {submitting ? '...' : vi.email.cta}
            </PrimaryButton>
            <button
              type="button"
              onClick={() => router.push('/paywall')}
              className="min-h-11 text-center text-sm font-semibold text-muted-brand transition hover:text-forest focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-brand"
            >
              {vi.email.skip}
            </button>
          </div>
        </GlowingCard>
    </ConversionShell>
  );
}
