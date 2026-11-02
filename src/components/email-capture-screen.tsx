'use client';

import { useEffect, useRef, useState } from 'react';
import { ConversionShell } from '@/components/conversion-shell';
import { PrimaryButton } from '@/components/primary-button';
import { RatingsAndCustomers } from '@/components/value-tour/value-tour-demos';
import { createLead } from '@/lib/api/client';
import { identifyMetaUser } from '@/lib/analytics/meta-identity';
import { identifyFunnelLead } from '@/lib/analytics/posthog';
import { identifyTiktokUser } from '@/lib/analytics/tiktok-identity';
import { trackEvent, trackStepViewed } from '@/lib/analytics/track';
import { useCopy, useLocale } from '@/lib/copy/use-copy';
import { isLocalPreviewHost } from '@/lib/local-preview';
import { isValidEmail } from '@/lib/quiz/email';
import { formatGoalDate, goalTimeline } from '@/lib/quiz/progress-projection';
import { useHydrated, useQuizStore } from '@/lib/quiz/store';
import { formatWeight } from '@/lib/quiz/units';
import { useUnits } from '@/lib/quiz/use-units';
import { saveCheckoutEmail } from '@/lib/revenuecat/checkout-email';

/** Asks where to send the plan the visitor already saw. The price comes after this, on the paywall. */
export function EmailCaptureScreen({ onComplete }: { onComplete: () => void }) {
  const copy = useCopy();
  const locale = useLocale();
  const hydrated = useHydrated();
  const setLead = useQuizStore((s) => s.setLead);
  const data = useQuizStore((s) => s.data);
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const canBypassEmail = isLocalPreviewHost();
  const { system } = useUnits();
  const timeline = goalTimeline(data);
  const funnelEmail = copy.funnel.email;
  const headline = timeline
    ? funnelEmail.headline(formatWeight(timeline.targetKg, system, locale), formatGoalDate(timeline.date, locale, false))
    : funnelEmail.headlineFallback;

  useEffect(() => trackStepViewed('email_capture'), []);

  if (!hydrated) return null;

  const submit = async () => {
    if (!isValidEmail(email)) {
      setError(copy.email.invalid);
      inputRef.current?.focus();
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const lead = await createLead(email.trim(), data, { locale, units: system, off_plan_moment: data.hardest_eating_moment });
      setLead(lead);
      saveCheckoutEmail(email.trim());
      const secureCookie = window.location.protocol === 'https:' ? '; Secure' : '';
      document.cookie = `nutree_locale=${locale}; Max-Age=31536000; Path=/; SameSite=Lax${secureCookie}`;
      identifyMetaUser({ email: email.trim(), externalId: lead.lead_id, firstName: data.name });
      identifyFunnelLead(lead.lead_id, email.trim());
      // Hashing is async; the CompleteRegistration sent with email_captured needs the result.
      await identifyTiktokUser({ email: email.trim(), externalId: lead.lead_id }).catch(() => null);
      trackEvent('email_captured', {});
      onComplete();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'We could not save your checkout draft. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const bypassEmailForLocal = () => {
    setLead({ lead_id: 'local-preview-lead', masked_email: 'l***@nutree.dev', status: 'payment_pending' });
    trackEvent('email_bypassed_local', {});
    onComplete();
  };

  return (
    <ConversionShell className="justify-start">
      <section className="w-full min-w-0 max-w-full rounded-[1.5rem] border border-border-brand bg-white/92 p-5 shadow-[0_6px_16px_rgb(16_39_32_/_0.07)]">
        <div className="flex min-w-0 flex-col gap-4">
          <h1 className="text-[1.75rem] font-extrabold leading-tight tracking-[-0.02em] text-forest">{headline}</h1>
          <p className="text-base font-semibold leading-relaxed text-slate-brand">{funnelEmail.body}</p>
          {timeline && <p className="-mt-2 text-xs font-semibold text-muted-brand">{funnelEmail.estimate}</p>}
          <div className="grid min-w-0 gap-2">
            <label htmlFor="email" className="text-sm font-extrabold text-forest">Email</label>
            <input
              ref={inputRef}
              id="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              value={email}
              onChange={(event) => { setEmail(event.target.value); if (error) setError(null); }}
              onKeyDown={(event) => event.key === 'Enter' && void submit()}
              placeholder={copy.email.placeholder}
              aria-invalid={error ? true : undefined}
              aria-describedby="email-helper email-error"
              className="ph-no-capture w-full min-w-0 min-h-14 rounded-2xl border border-border-brand bg-bg-brand px-5 py-4 text-lg font-semibold text-forest outline-none transition placeholder:text-muted-brand focus:border-teal-brand focus:ring-4 focus:ring-teal-brand/15 aria-[invalid=true]:border-error-brand aria-[invalid=true]:focus:ring-error-brand/15"
            />
            <p id="email-helper" className="text-sm font-medium text-muted-brand">{funnelEmail.helper}</p>
            {error && <p id="email-error" role="alert" className="text-sm font-bold text-error-brand">{error}</p>}
          </div>
          <PrimaryButton disabled={submitting || !email} onClick={submit}>{submitting ? '...' : funnelEmail.cta}</PrimaryButton>
          <RatingsAndCustomers />
          <p className="text-center text-xs font-semibold text-muted-brand">{funnelEmail.trustBody}</p>
          {canBypassEmail && (
            <button type="button" onClick={bypassEmailForLocal} className="min-h-12 rounded-2xl border border-border-brand bg-white px-4 text-sm font-extrabold text-forest transition hover:bg-mist focus:outline-none focus-visible:ring-4 focus-visible:ring-teal-brand/20 active:scale-[0.98]">
              {copy.email.devBypass}
            </button>
          )}
        </div>
      </section>
    </ConversionShell>
  );
}
