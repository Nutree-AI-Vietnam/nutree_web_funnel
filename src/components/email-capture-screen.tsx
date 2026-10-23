'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { ConversionShell } from '@/components/conversion-shell';
import { PrimaryButton } from '@/components/primary-button';
import { createLead } from '@/lib/api/client';
import { identifyMetaUser } from '@/lib/analytics/meta-identity';
import { identifyFunnelLead } from '@/lib/analytics/posthog';
import { identifyTiktokUser } from '@/lib/analytics/tiktok-identity';
import { trackEvent, trackStepViewed } from '@/lib/analytics/track';
import { useCopy, useLocale } from '@/lib/copy/use-copy';
import { isValidEmail } from '@/lib/quiz/email';
import { isLocalPreviewHost } from '@/lib/local-preview';
import { useHydrated, useQuizStore } from '@/lib/quiz/store';
import { saveCheckoutEmail } from '@/lib/revenuecat/checkout-email';
import { StarRow } from '@/components/value-tour/value-tour-demos';
import { formatGoalDate, goalTimeline } from '@/lib/quiz/progress-projection';
import { formatWeight } from '@/lib/quiz/units';
import { useUnits } from '@/lib/quiz/use-units';

const TRUST_AVATAR_IMAGES = ['/images/trust-female.webp', '/images/trust-aiony.webp', '/images/trust-good-faces.webp', '/images/trust-ali.webp', '/images/trust-jurica.webp'] as const;

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
    ? funnelEmail.headline(formatWeight(timeline.targetKg, system), formatGoalDate(timeline.date, locale, false))
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
      const lead = await createLead(email.trim(), data);
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

  return <ConversionShell className="justify-start"><section className="w-full min-w-0 max-w-full rounded-[1.5rem] border border-border-brand bg-white/92 p-5 shadow-[0_18px_55px_rgb(16_39_32_/_0.08)]"><div className="flex min-w-0 flex-col gap-4"><div className="flex items-center gap-3 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-extrabold text-emerald-800"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-emerald-500 text-white">✓</span><span>{copy.email.readyBadge}</span></div><h1 className="text-3xl font-extrabold leading-tight text-forest">{headline}</h1>{timeline && <p className="-mt-2 text-xs font-semibold text-muted-brand">{funnelEmail.estimate}</p>}<p className="text-base font-semibold leading-relaxed text-slate-brand">{funnelEmail.body}</p><div className="grid min-w-0 gap-2"><label htmlFor="email" className="text-sm font-extrabold text-forest">Email</label><input ref={inputRef} id="email" type="email" inputMode="email" autoComplete="email" value={email} onChange={(event) => { setEmail(event.target.value); if (error) setError(null); }} onKeyDown={(event) => event.key === 'Enter' && void submit()} placeholder={copy.email.placeholder} aria-invalid={error ? true : undefined} aria-describedby="email-helper email-error" className="ph-no-capture w-full min-w-0 min-h-14 rounded-2xl border border-border-brand bg-bg-brand px-5 py-4 text-lg font-semibold text-forest outline-none transition placeholder:text-muted-brand focus:border-teal-brand focus:ring-4 focus:ring-teal-brand/15 aria-[invalid=true]:border-error-brand aria-[invalid=true]:focus:ring-error-brand/15" /><p id="email-helper" className="text-sm font-medium text-muted-brand">{funnelEmail.helper}</p>{error && <p id="email-error" role="alert" className="text-sm font-bold text-error-brand">{error}</p>}</div><PrimaryButton disabled={submitting || !email} onClick={submit}>{submitting ? '...' : funnelEmail.cta}</PrimaryButton><p className="flex items-center justify-center gap-2 text-center text-xs font-bold text-slate-brand" aria-label={copy.funnel.rating.line}><StarRow value={Number(copy.funnel.rating.value)} className="text-sm" /><span aria-hidden="true">{copy.funnel.rating.value} · {copy.funnel.rating.count} · {copy.funnel.rating.store}</span></p><div className="border-t border-border-brand/70 pt-4 text-center">{copy.email.socialCount && (<div className="flex max-w-full items-center justify-center gap-2 sm:gap-3" aria-label={`${copy.email.socialCount} ${copy.email.socialLabel}`}><div className="flex -space-x-2 sm:-space-x-3">{TRUST_AVATAR_IMAGES.map((src) => <span key={src} className="relative h-[34px] w-[34px] overflow-hidden rounded-full border-2 border-white bg-mist shadow-sm sm:h-11 sm:w-11"><Image src={src} alt="" fill sizes="44px" className="object-cover" /></span>)}</div><div className="flex min-w-0 flex-col items-center gap-0.5 sm:flex-row sm:items-center sm:gap-2"><span className="grid h-[34px] min-w-[34px] place-items-center rounded-full border-2 border-white bg-[linear-gradient(160deg,#218f7a,#17453a)] px-1.5 text-[11px] font-extrabold leading-none tracking-tight text-white shadow-[0_8px_18px_rgb(23_69_58_/_0.18)] sm:h-11 sm:min-w-11 sm:px-2.5 sm:text-[12px]">{copy.email.socialCount}</span><span className="max-w-[4.5rem] text-center text-[11px] font-extrabold leading-tight text-forest sm:text-left sm:text-[13px]">{copy.email.socialLabel}</span></div></div>)}<p className="mt-3 text-sm font-extrabold text-forest">{copy.email.trustTitle}</p><p className="mt-1 text-xs font-semibold leading-relaxed text-muted-brand">{funnelEmail.trustBody}</p><p className="mt-2 text-xs font-medium text-muted-brand">{copy.email.privacyPrefix} · {copy.email.privacyLine}</p></div>{canBypassEmail && <button type="button" onClick={bypassEmailForLocal} className="min-h-12 rounded-2xl border border-border-brand bg-white px-4 text-sm font-extrabold text-forest transition hover:bg-mist focus:outline-none focus-visible:ring-4 focus-visible:ring-teal-brand/20 active:scale-[0.98]">{copy.email.devBypass}</button>}</div></section></ConversionShell>;
}
