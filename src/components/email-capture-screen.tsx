'use client';

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
import { AppStoreRating } from '@/components/value-tour/value-tour-demos';
import { Icon } from '@/components/ui/icons';
import { formatGoalDate, goalTimeline } from '@/lib/quiz/progress-projection';
import { formatWeight } from '@/lib/quiz/units';
import { useUnits } from '@/lib/quiz/use-units';
import { computeTdeeResult } from '@/lib/tdee/calculator';
import { firstChangePlan, planNumbers, sampleDay } from '@/lib/quiz/plan-content';
import type { OnboardingPayload, TdeeResult } from '@/lib/quiz/types';

/**
 * What the email unlocks. Calories and protein were shown on earlier screens, so they stay
 * readable; the day of meals and the first three changes are new, and stay blurred until the email.
 */
function PlanTeaser({ data, tdee }: { data: OnboardingPayload; tdee: TdeeResult }) {
  const copy = useCopy();
  const locale = useLocale();
  const answers = useQuizStore((state) => state.planAnswers);
  const email = copy.funnel.email;
  const plan = copy.funnel.plan;
  const format = new Intl.NumberFormat(locale === 'vi' ? 'vi-VN' : 'en-US');
  const numbers = planNumbers(tdee);
  const known = [
    { label: email.teaserCalories, value: `${format.format(numbers.calories)} kcal` },
    { label: email.teaserProtein, value: `${numbers.proteinG} g` },
  ];
  const locked = [
    { label: email.teaserDay, lines: sampleDay(tdee.calories, data.dietary_preferences).map((row) => plan.dishes[row.dish]) },
    { label: email.teaserChanges, lines: firstChangePlan(data, answers).map((change) => plan.changes[change.id].title(numbers)) },
  ];
  return (
    <section aria-label={email.teaserTitle} className="grid gap-2">
      <ul className="grid grid-cols-2 gap-2">
        {known.map((row) => (
          <li key={row.label} className="flex min-w-0 items-center gap-2 rounded-xl border border-border-brand/70 bg-white px-2.5 py-2">
            <span aria-hidden="true" className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-teal-brand text-[0.62rem] font-black text-white">✓</span>
            <span className="min-w-0">
              <span className="block text-[0.68rem] font-bold leading-tight text-muted-brand">{row.label}</span>
              <span className="block text-sm font-extrabold tabular-nums text-forest">{row.value}</span>
            </span>
          </li>
        ))}
      </ul>
      <div className="rounded-2xl border border-border-brand/80 bg-mist/50 p-2.5">
        <p className="flex items-center gap-1.5 text-xs font-bold text-muted-brand"><Icon name="lock" className="h-3.5 w-3.5 text-teal-brand" />{email.teaserHidden}</p>
        <ul className="mt-2 grid grid-cols-2 gap-2" aria-hidden="true">
          {locked.map((block) => (
            <li key={block.label} className="min-w-0 rounded-xl bg-white px-2.5 py-2">
              <span className="block text-[0.68rem] font-bold leading-tight text-muted-brand">{block.label}</span>
              {block.lines.map((line) => (
                <span key={line} className="mt-1 block select-none truncate text-[0.72rem] font-bold text-forest blur-[3.5px]">{line}</span>
              ))}
            </li>
          ))}
        </ul>
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

  return <ConversionShell className="justify-start"><section className="w-full min-w-0 max-w-full rounded-[1.5rem] border border-border-brand bg-white/92 p-5 shadow-[0_18px_55px_rgb(16_39_32_/_0.08)]"><div className="flex min-w-0 flex-col gap-4"><div className="flex items-center gap-3 rounded-2xl bg-mist px-4 py-3 text-sm font-extrabold text-forest"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-teal-brand text-white">✓</span><span>{copy.email.readyBadge}</span></div><h1 className="text-[1.75rem] font-extrabold leading-tight tracking-[-0.02em] text-forest">{headline}</h1>{timeline && <p className="-mt-2 text-xs font-semibold text-muted-brand">{funnelEmail.estimate}</p>}{!teaserTdee && <p className="text-base font-semibold leading-relaxed text-slate-brand">{funnelEmail.body}</p>}{teaserTdee && <PlanTeaser data={data} tdee={teaserTdee} />}<div className="grid min-w-0 gap-2"><label htmlFor="email" className="text-sm font-extrabold text-forest">Email</label><input ref={inputRef} id="email" type="email" inputMode="email" autoComplete="email" value={email} onChange={(event) => { setEmail(event.target.value); if (error) setError(null); }} onKeyDown={(event) => event.key === 'Enter' && void submit()} placeholder={copy.email.placeholder} aria-invalid={error ? true : undefined} aria-describedby="email-helper email-error" className="ph-no-capture w-full min-w-0 min-h-14 rounded-2xl border border-border-brand bg-bg-brand px-5 py-4 text-lg font-semibold text-forest outline-none transition placeholder:text-muted-brand focus:border-teal-brand focus:ring-4 focus:ring-teal-brand/15 aria-[invalid=true]:border-error-brand aria-[invalid=true]:focus:ring-error-brand/15" /><p id="email-helper" className="text-sm font-medium text-muted-brand">{funnelEmail.helper}</p>{error && <p id="email-error" role="alert" className="text-sm font-bold text-error-brand">{error}</p>}</div><PrimaryButton disabled={submitting || !email} onClick={submit}>{submitting ? '...' : funnelEmail.cta}</PrimaryButton><AppStoreRating /><p className="text-center text-xs font-semibold text-muted-brand">{funnelEmail.trustBody}</p>{canBypassEmail && <button type="button" onClick={bypassEmailForLocal} className="min-h-12 rounded-2xl border border-border-brand bg-white px-4 text-sm font-extrabold text-forest transition hover:bg-mist focus:outline-none focus-visible:ring-4 focus-visible:ring-teal-brand/20 active:scale-[0.98]">{copy.email.devBypass}</button>}</div></section></ConversionShell>;
}
