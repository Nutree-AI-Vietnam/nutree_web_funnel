'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { NutreeLogo } from '@/components/nutree-logo';
import { answersFromSnapshot, PAYWALL_AUTOSTART_KEY, readPlanLinkFragment, redeemPlanLink } from '@/lib/funnel/plan-link';
import { useQuizStore } from '@/lib/quiz/store';
import { saveCheckoutEmail } from '@/lib/revenuecat/checkout-email';

/**
 * Opens a plan from a reminder email on any device. The token is read from the
 * fragment and cleared at once; the answers and the lead come back from the
 * backend, and the visitor lands on their paywall.
 */
export function PlanLinkPageClient() {
  const [failed, setFailed] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const fragment = readPlanLinkFragment(window.location.hash);
    window.history.replaceState({}, document.title, '/plan');
    if (!fragment) {
      window.setTimeout(() => setFailed(true), 0);
      return;
    }
    redeemPlanLink(fragment.token)
      .then((plan) => {
        const locale = plan.locale ?? 'en';
        const store = useQuizStore.getState();
        store.reset();
        store.setLocale(locale);
        if (plan.units) store.setUnits(plan.units);
        if (plan.snapshot) store.setData(answersFromSnapshot(plan.snapshot));
        store.setLead(plan.lead);
        store.setCurrentStep('confidence');
        store.setFunnelScreen('paywall');
        if (plan.email) saveCheckoutEmail(plan.email);
        if (fragment.start) {
          try {
            window.sessionStorage.setItem(PAYWALL_AUTOSTART_KEY, '1');
          } catch {
            // Without storage the paywall still opens; checkout waits for a tap.
          }
        }
        window.location.replace(`/survey/${locale}`);
      })
      .catch(() => setFailed(true));
  }, []);

  return (
    <main className="grid min-h-dvh place-items-center bg-[#f6faf7] px-5 text-center">
      <section className="w-full max-w-md rounded-[2rem] border border-border-brand bg-white p-8 shadow-[0_24px_70px_rgb(23_69_58_/_0.10)]">
        <NutreeLogo className="mx-auto h-14 w-14" />
        {failed ? (
          <>
            <h1 className="mt-5 text-2xl font-extrabold text-forest">This link has expired</h1>
            <p className="mt-3 text-sm font-semibold leading-relaxed text-slate-brand">Plan links work for 7 days and only the newest one opens your plan. Build it again in about 3 minutes.</p>
            <Link href="/survey/en" className="mt-6 flex min-h-13 items-center justify-center rounded-2xl bg-forest px-5 font-extrabold text-white">Build my plan</Link>
          </>
        ) : (
          <>
            <h1 className="mt-5 text-2xl font-extrabold text-forest">Opening your plan…</h1>
            <span className="mx-auto mt-5 block h-6 w-6 animate-spin rounded-full border-2 border-teal-brand/25 border-t-teal-brand" aria-hidden="true" />
          </>
        )}
      </section>
    </main>
  );
}
