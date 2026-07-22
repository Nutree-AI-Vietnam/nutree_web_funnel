'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ConversionShell } from '@/components/conversion-shell';
import { PrimaryButton } from '@/components/primary-button';
import { getPaymentStatus } from '@/lib/api/client';
import { trackEvent, trackStepViewed } from '@/lib/analytics/track';
import { vi } from '@/lib/copy/vi';
import { useHydrated, useQuizStore } from '@/lib/quiz/store';

function MomoReturnContent() {
  const router = useRouter();
  const params = useSearchParams();
  const hydrated = useHydrated();
  const storedOrderId = useQuizStore((s) => s.momoOrderId);
  const setPurchased = useQuizStore((s) => s.setPurchased);
  const [statusText, setStatusText] = useState<string>(vi.momoReturn.body);
  const [checking, setChecking] = useState(false);

  const orderId = useMemo(
    () => params.get('orderId') ?? params.get('order_id') ?? storedOrderId,
    [params, storedOrderId],
  );

  const check = useCallback(async () => {
    if (!orderId) {
      router.replace('/paywall');
      return;
    }
    setChecking(true);
    try {
      const status = await getPaymentStatus(orderId);
      if (status.paid) {
        setPurchased(true);
        trackEvent('checkout_completed_client', { provider: 'momo' });
        setStatusText(vi.momoReturn.paid);
        router.replace('/success');
        return;
      }
      setStatusText(vi.paywall.paymentError);
    } catch {
      setStatusText(vi.paywall.paymentError);
    } finally {
      setChecking(false);
    }
  }, [orderId, router, setPurchased]);

  useEffect(() => trackStepViewed('momo_return'), []);

  useEffect(() => {
    if (!hydrated) return;
    const initial = window.setTimeout(() => void check(), 0);
    const timer = window.setInterval(() => void check(), 2500);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(timer);
    };
  }, [check, hydrated]);

  if (!hydrated) return null;

  return (
    <ConversionShell className="gap-5">
      <div className="rounded-3xl bg-forest p-5 text-white shadow-sm">
        <div className="h-1 w-16 rounded-full bg-teal-brand" />
        <h1 className="mt-2 text-3xl font-extrabold">{vi.momoReturn.headline}</h1>
        <div className="mt-3 text-sm font-semibold opacity-80">MoMo</div>
      </div>
      <p className="text-slate-brand">{statusText}</p>
      <PrimaryButton disabled={checking} onClick={() => void check()}>
        {checking ? '...' : vi.momoReturn.retry}
      </PrimaryButton>
    </ConversionShell>
  );
}

export default function MomoReturnPage() {
  return (
    <Suspense fallback={null}>
      <MomoReturnContent />
    </Suspense>
  );
}
