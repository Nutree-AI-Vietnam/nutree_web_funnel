'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { ConversionShell } from '@/components/conversion-shell';
import { PrimaryButton } from '@/components/primary-button';
import { createLead } from '@/lib/api/client';
import { trackEvent, trackStepViewed } from '@/lib/analytics/track';
import { useCopy } from '@/lib/copy/use-copy';
import { isValidEmail } from '@/lib/quiz/email';
import { isLocalPreviewHost } from '@/lib/local-preview';
import { useHydrated, useQuizStore } from '@/lib/quiz/store';
import { saveCheckoutEmail } from '@/lib/revenuecat/checkout-email';

const TRUST_AVATAR_IMAGES = ['/images/trust-female.webp', '/images/trust-aiony.webp', '/images/trust-good-faces.webp', '/images/trust-ali.webp', '/images/trust-jurica.webp'] as const;

export function EmailCaptureScreen({ onComplete }: { onComplete: () => void }) {
  const copy = useCopy();
  const hydrated = useHydrated();
  const setLead = useQuizStore((s) => s.setLead);
  const data = useQuizStore((s) => s.data);
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const canBypassEmail = isLocalPreviewHost();

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
      setLead(await createLead(email.trim(), data));
      saveCheckoutEmail(email.trim());
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

  return <ConversionShell className="justify-center"><section className="rounded-[1.5rem] border border-border-brand bg-white/92 p-5 shadow-[0_18px_55px_rgb(16_39_32_/_0.08)]"><div className="flex flex-col gap-4"><div className="flex items-center gap-3 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-extrabold text-emerald-800"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-emerald-500 text-white">✓</span><span>{copy.email.readyBadge}</span></div><h1 className="text-3xl font-extrabold leading-tight text-forest">{copy.email.headline}</h1><p className="text-base font-semibold leading-relaxed text-slate-brand">{copy.email.body}</p><div className="grid gap-2"><label htmlFor="email" className="text-sm font-extrabold text-forest">Email</label><input ref={inputRef} id="email" type="email" inputMode="email" autoComplete="email" value={email} onChange={(event) => { setEmail(event.target.value); if (error) setError(null); }} onKeyDown={(event) => event.key === 'Enter' && void submit()} placeholder={copy.email.placeholder} aria-invalid={error ? true : undefined} aria-describedby="email-helper email-error" className="min-h-14 rounded-2xl border border-border-brand bg-bg-brand px-5 py-4 text-lg font-semibold text-forest outline-none transition placeholder:text-muted-brand focus:border-teal-brand focus:ring-4 focus:ring-teal-brand/15 aria-[invalid=true]:border-error-brand aria-[invalid=true]:focus:ring-error-brand/15" /><p id="email-helper" className="text-sm font-medium text-muted-brand">{copy.email.helper}</p>{error && <p id="email-error" role="alert" className="text-sm font-bold text-error-brand">{error}</p>}</div><PrimaryButton disabled={submitting || !email} onClick={submit}>{submitting ? '...' : copy.email.cta}</PrimaryButton><div className="border-t border-border-brand/70 pt-4 text-center"><div className="flex justify-center -space-x-3" aria-hidden="true">{TRUST_AVATAR_IMAGES.map((src) => <span key={src} className="relative h-12 w-12 overflow-hidden rounded-full border-2 border-white bg-mist shadow-sm"><Image src={src} alt="" fill sizes="48px" className="object-cover" /></span>)}</div><p className="mt-3 text-sm font-extrabold text-forest">{copy.email.trustTitle}</p><p className="mt-1 text-xs font-semibold leading-relaxed text-muted-brand">{copy.email.trustBody}</p><p className="mt-2 text-xs font-medium text-muted-brand">{copy.email.privacyPrefix} · {copy.email.privacyLine}</p></div>{canBypassEmail && <button type="button" onClick={bypassEmailForLocal} className="min-h-12 rounded-2xl border border-border-brand bg-white px-4 text-sm font-extrabold text-forest transition hover:bg-mist focus:outline-none focus-visible:ring-4 focus-visible:ring-teal-brand/20 active:scale-[0.98]">{copy.email.devBypass}</button>}</div></section></ConversionShell>;
}
