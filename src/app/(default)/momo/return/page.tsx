'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { ConversionShell } from '@/components/conversion-shell';
import { MomoLogo } from '@/components/momo-logo';
import { trackEvent } from '@/lib/analytics/track';
import { useCopy } from '@/lib/copy/use-copy';
import { fetchMomoOrderStatus, momoOrderIdFrom } from '@/lib/payments/momo-checkout';
import { useQuizStore } from '@/lib/quiz/store';

type ReturnState = 'confirming' | 'paid' | 'failed' | 'expired' | 'session' | 'slow';

const POLL_MS = 3000;
const GIVE_UP_MS = 120_000;

function MomoReturn() {
  const params = useSearchParams();
  const router = useRouter();
  const copy = useCopy().momoReturn;
  const storedOrderId = useQuizStore((state) => state.momoOrderId);
  const orderId = momoOrderIdFrom(params) ?? storedOrderId;
  const [state, setState] = useState<ReturnState>(orderId ? 'confirming' : 'session');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!orderId) return;
    let stopped = false;
    let timer = 0;
    const startedAt = Date.now();
    const finish = (next: ReturnState) => {
      stopped = true;
      window.clearTimeout(timer);
      setState(next);
    };
    const poll = async () => {
      const { status, httpStatus } = await fetchMomoOrderStatus(orderId).catch(() => ({ status: null, httpStatus: 0 }));
      if (stopped) return;
      if (status === 'paid') {
        trackEvent('momo_checkout_completed', { order_id: orderId });
        const store = useQuizStore.getState();
        store.setPurchased(true);
        if (store.lead && store.lead.status !== 'payment_verified' && store.lead.status !== 'claimed') {
          store.setLead({ ...store.lead, status: 'payment_verified' });
        }
        finish('paid');
        timer = window.setTimeout(() => router.replace('/postcheckout'), 1500);
        return;
      }
      if (status === 'failed' || status === 'expired') {
        trackEvent('momo_checkout_failed', { order_id: orderId, status });
        finish(status);
        return;
      }
      if (httpStatus === 401 || httpStatus === 404) return finish('session');
      if (Date.now() - startedAt > GIVE_UP_MS) return finish('slow');
      timer = window.setTimeout(() => { void poll(); }, POLL_MS);
    };
    void poll();
    return () => {
      stopped = true;
      window.clearTimeout(timer);
    };
  }, [attempt, orderId, router]);

  const view = {
    confirming: { headline: copy.headline, body: copy.body },
    paid: { headline: copy.paidHeadline, body: copy.paid },
    failed: { headline: copy.failedHeadline, body: copy.failed },
    expired: { headline: copy.expiredHeadline, body: copy.expired },
    session: { headline: copy.sessionHeadline, body: copy.session },
    slow: { headline: copy.headline, body: copy.slow },
  }[state];

  return (
    <ConversionShell className="text-center">
      <div className="mx-auto mt-6 flex justify-center"><MomoLogo size={56} /></div>
      <h1 className="mt-5 text-3xl font-extrabold text-forest">{view.headline}</h1>
      <p className="mt-3 text-slate-brand" role="status">{view.body}</p>
      {state === 'confirming' && <div aria-hidden="true" className="mx-auto mt-6 h-8 w-8 animate-spin rounded-full border-4 border-[#f3d6e7] border-t-[#a50064]" />}
      {orderId && <p className="mt-6 text-sm font-semibold text-muted-brand">{copy.orderLabel}: <span className="font-mono text-forest">{orderId}</span></p>}
      {(state === 'failed' || state === 'expired' || state === 'session') && (
        <Link href="/paywall" className="mx-auto mt-6 inline-flex min-h-13 items-center justify-center rounded-2xl bg-forest px-6 font-extrabold text-white transition hover:bg-emerald-deep">{copy.tryAgain}</Link>
      )}
      {state === 'slow' && (
        <button type="button" onClick={() => { setState('confirming'); setAttempt((value) => value + 1); }} className="mx-auto mt-6 inline-flex min-h-13 items-center justify-center rounded-2xl bg-forest px-6 font-extrabold text-white transition hover:bg-emerald-deep">{copy.retry}</button>
      )}
    </ConversionShell>
  );
}

export default function MomoReturnPage() {
  return (
    <Suspense fallback={null}>
      <MomoReturn />
    </Suspense>
  );
}
