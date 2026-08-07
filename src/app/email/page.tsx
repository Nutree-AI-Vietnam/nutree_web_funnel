'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ConversionShell } from '@/components/conversion-shell';
import { PrimaryButton } from '@/components/primary-button';
import { createLead } from '@/lib/api/client';
import { trackEvent, trackStepViewed } from '@/lib/analytics/track';
import { useCopy } from '@/lib/copy/use-copy';
import { isValidEmail } from '@/lib/quiz/email';
import { useHydrated, useQuizStore } from '@/lib/quiz/store';

export default function EmailPage() {
  const router = useRouter();
  const vi = useCopy();
  const hydrated = useHydrated();
  const setLead = useQuizStore((s) => s.setLead);
  const data = useQuizStore((s) => s.data);
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const canBypassEmail = process.env.NODE_ENV !== 'production';

  useEffect(() => trackStepViewed('email_capture'), []);
  const currentEmail = email;

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
      setLead(await createLead(currentEmail.trim(), data));
      trackEvent('email_captured', {});
      router.push('/welcome-gift');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'We could not save your checkout draft. Please try again.');
    } finally { setSubmitting(false); }
  };

  const bypassEmailForLocal = () => {
    setLead({
      lead_id: 'local-preview-lead', masked_email: 'l***@nutree.dev', status: 'payment_pending',
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
          <div className="grid gap-2">
            <label htmlFor="email" className="text-sm font-extrabold text-forest">
              Email
            </label>
            <input
              ref={inputRef}
              id="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              value={currentEmail}
              onChange={(event) => {
                setEmail(event.target.value);
                if (error) setError(null);
              }}
              onKeyDown={(event) => event.key === 'Enter' && void submit()}
              placeholder={vi.email.placeholder}
              aria-invalid={error ? true : undefined}
              aria-describedby="email-helper email-error"
              className="min-h-14 rounded-2xl border border-border-brand bg-bg-brand px-5 py-4 text-lg font-semibold text-forest outline-none transition placeholder:text-muted-brand focus:border-teal-brand focus:ring-4 focus:ring-teal-brand/15 aria-[invalid=true]:border-error-brand aria-[invalid=true]:focus:ring-error-brand/15"
            />
            <p id="email-helper" className="text-sm font-medium text-muted-brand">
              {vi.email.helper}
            </p>
            {error && (
              <p id="email-error" role="alert" className="text-sm font-bold text-error-brand">
                {error}
              </p>
            )}
          </div>
          <PrimaryButton disabled={submitting || !currentEmail} onClick={submit}>
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
