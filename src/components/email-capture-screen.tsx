'use client';

import { motion, useReducedMotion } from 'motion/react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
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
import { AppStoreRating } from '@/components/value-tour/value-tour-demos';
import { Icon } from '@/components/ui/icons';
import { formatGoalDate, goalTimeline } from '@/lib/quiz/progress-projection';
import { formatWeight } from '@/lib/quiz/units';
import { useUnits } from '@/lib/quiz/use-units';
import { computeTdeeResult } from '@/lib/tdee/calculator';
import { useChangeSourceLine } from '@/components/plan/plan-overview';
import { firstChangePlan, planNumbers, sampleDay } from '@/lib/quiz/plan-content';
import type { OnboardingPayload, TdeeResult } from '@/lib/quiz/types';
import { cn } from '@/lib/utils';

/** A hidden line of the plan: the real text, blurred, with one sheen across it on arrival. */
function BlurLine({ index, oneLine, children }: { index: number; oneLine?: boolean; children: ReactNode }) {
  const reduce = useReducedMotion();
  return (
    <span aria-hidden="true" className="relative -mx-1 mt-0.5 block overflow-hidden px-1">
      <span className={cn('block select-none text-[0.98rem] font-extrabold leading-snug text-forest blur-[5px]', oneLine ? 'truncate' : 'line-clamp-2')}>{children}</span>
      {!reduce && (
        <motion.span
          className="pointer-events-none absolute inset-y-0 left-0 w-2/5 bg-[linear-gradient(90deg,transparent,rgb(255_255_255/0.7),transparent)]"
          initial={{ x: '-100%' }}
          animate={{ x: '260%' }}
          transition={{ delay: 0.6 + index * 0.1, duration: 1.2, ease: 'easeInOut' }}
        />
      )}
    </span>
  );
}

/**
 * What the email unlocks, tied to the visitor's own answers: each "You said …" line stays
 * readable above the change it led to, which stays blurred until the email. The next screen
 * shows the same changes and day of meals unblurred.
 */
function PlanTeaser({ data, tdee }: { data: OnboardingPayload; tdee: TdeeResult }) {
  const copy = useCopy();
  const locale = useLocale();
  const answers = useQuizStore((state) => state.planAnswers);
  const sourceLine = useChangeSourceLine();
  const email = copy.funnel.email;
  const plan = copy.funnel.plan;
  const format = new Intl.NumberFormat(locale === 'vi' ? 'vi-VN' : 'en-US');
  const numbers = planNumbers(tdee);
  // Vegan is the only diet answer named; the others are allergy needs.
  const diet = data.dietary_preferences?.includes('vegan') ? copy.diet.options.find((option) => option.key === 'vegan')?.label.toLowerCase() ?? null : null;
  return (
    <section aria-label={email.teaserTitle} className="rounded-2xl border border-border-brand/80 bg-mist/50 p-3.5">
      <h2 className="flex items-center gap-1.5 text-[0.95rem] font-extrabold text-forest"><Icon name="lock" className="h-4 w-4 text-teal-brand" />{email.teaserChanges}<span className="sr-only">, {email.teaserLocked}</span></h2>
      <ol className="mt-2 divide-y divide-border-brand/60">
        {firstChangePlan(data, answers).map((change, index) => (
          <li key={change.id} className="py-2.5 last:pb-0">
            <span className="block text-[0.76rem] font-bold text-teal-brand">{sourceLine(change.source)}</span>
            <BlurLine index={index}>{plan.changes[change.id].title(numbers)}</BlurLine>
          </li>
        ))}
      </ol>
      <div className="mt-2.5 border-t border-border-brand/60 pt-2.5">
        <p className="text-[0.76rem] font-bold text-teal-brand">{email.teaserDayFor(format.format(numbers.calories), diet)}</p>
        <BlurLine index={3} oneLine>{sampleDay(tdee.calories, data.dietary_preferences).map((row) => plan.dishes[row.dish]).join(', ')}</BlurLine>
      </div>
    </section>
  );
}

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
  const teaserTdee = computeTdeeResult(data);
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

  return <ConversionShell className="justify-start"><section className="w-full min-w-0 max-w-full rounded-[1.5rem] border border-border-brand bg-white/92 p-5 shadow-[0_18px_55px_rgb(16_39_32_/_0.08)]"><div className="flex min-w-0 flex-col gap-4"><h1 className="text-[1.75rem] font-extrabold leading-tight tracking-[-0.02em] text-forest">{headline}</h1>{timeline && <p className="-mt-2 text-xs font-semibold text-muted-brand">{funnelEmail.estimate}</p>}{!teaserTdee && <p className="text-base font-semibold leading-relaxed text-slate-brand">{funnelEmail.body}</p>}{teaserTdee && <PlanTeaser data={data} tdee={teaserTdee} />}<div className="grid min-w-0 gap-2"><label htmlFor="email" className="text-sm font-extrabold text-forest">Email</label><input ref={inputRef} id="email" type="email" inputMode="email" autoComplete="email" value={email} onChange={(event) => { setEmail(event.target.value); if (error) setError(null); }} onKeyDown={(event) => event.key === 'Enter' && void submit()} placeholder={copy.email.placeholder} aria-invalid={error ? true : undefined} aria-describedby="email-helper email-error" className="ph-no-capture w-full min-w-0 min-h-14 rounded-2xl border border-border-brand bg-bg-brand px-5 py-4 text-lg font-semibold text-forest outline-none transition placeholder:text-muted-brand focus:border-teal-brand focus:ring-4 focus:ring-teal-brand/15 aria-[invalid=true]:border-error-brand aria-[invalid=true]:focus:ring-error-brand/15" /><p id="email-helper" className="text-sm font-medium text-muted-brand">{funnelEmail.helper}</p>{error && <p id="email-error" role="alert" className="text-sm font-bold text-error-brand">{error}</p>}</div><PrimaryButton disabled={submitting || !email} onClick={submit}>{submitting ? '...' : funnelEmail.cta}</PrimaryButton><AppStoreRating /><p className="text-center text-xs font-semibold text-muted-brand">{funnelEmail.trustBody}</p>{canBypassEmail && <button type="button" onClick={bypassEmailForLocal} className="min-h-12 rounded-2xl border border-border-brand bg-white px-4 text-sm font-extrabold text-forest transition hover:bg-mist focus:outline-none focus-visible:ring-4 focus-visible:ring-teal-brand/20 active:scale-[0.98]">{copy.email.devBypass}</button>}</div></section></ConversionShell>;
}
