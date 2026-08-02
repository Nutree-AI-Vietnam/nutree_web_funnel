'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getLeadStatus, requestLeadResend } from '@/lib/api/client';
import { useHydrated, useQuizStore } from '@/lib/quiz/store';
import type { LeadStatus } from '@/lib/quiz/types';

const statusCopy: Record<LeadStatus, string> = {
  payment_pending: 'We’re waiting for secure payment verification. You will not be charged again.',
  payment_verified: 'Your payment is verified. We’re preparing your Nutree sign-in link.',
  claim_email_sent: 'Your secure Nutree link is on its way. Open it on your phone.',
  email_delivery_delayed: 'Your link is delayed. You can request another secure email below.',
  claim_expired: 'This link has expired. Request another secure email below.',
  claim_revoked: 'This claim is no longer available. Contact support if you need help.',
  claim_conflict: 'We need to verify this claim safely. Contact support for help.',
  claimed: 'Your Nutree setup is complete. Open Nutree on your phone.',
};

export function WelcomeStatus() {
  const hydrated = useHydrated();
  const lead = useQuizStore((state) => state.lead);
  const leadId = lead?.lead_id;
  const setLead = useQuizStore((state) => state.setLead);
  const [error, setError] = useState<string | null>(null);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (!leadId) return;
    const refresh = () => getLeadStatus(leadId).then(setLead).catch(() => setError('We could not refresh payment status yet. Please wait a moment.'));
    void refresh();
    const timer = window.setInterval(() => void refresh(), 10_000);
    return () => window.clearInterval(timer);
  }, [leadId, setLead]);

  if (!hydrated) return null;
  if (!lead) return <Link href="/email" className="mt-8 inline-flex rounded-full bg-forest px-6 py-3 text-sm font-extrabold text-white">Return to email capture</Link>;
  const canResend = lead.status === 'email_delivery_delayed' || lead.status === 'claim_expired';
  return <><p className="mt-5 text-base font-semibold leading-relaxed text-slate-brand" role="status">{statusCopy[lead.status]}</p>{error && <p className="mt-4 text-sm font-bold text-error-brand" role="alert">{error}</p>}{canResend && <button type="button" disabled={resending} onClick={() => { setResending(true); void requestLeadResend(lead.lead_id).then(() => getLeadStatus(lead.lead_id)).then(setLead).catch(() => setError('We could not send a new link yet.')).finally(() => setResending(false)); }} className="mt-6 rounded-full bg-forest px-6 py-3 text-sm font-extrabold text-white disabled:opacity-50">{resending ? 'Sending…' : 'Send a new secure link'}</button>}</>;
}
