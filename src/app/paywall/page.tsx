'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PrimaryButton } from '@/components/primary-button';
import { createMomoSubscriptionCheckout } from '@/lib/api/client';
import { trackEvent, trackStepViewed } from '@/lib/analytics/track';
import { vi } from '@/lib/copy/vi';
import { useHydrated, useQuizStore } from '@/lib/quiz/store';

export default function PaywallPage() {
  const router = useRouter();
  const hydrated = useHydrated();
  const lead = useQuizStore((s) => s.lead);
  const setMomoOrderId = useQuizStore((s) => s.setMomoOrderId);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => trackStepViewed('paywall'), []);

  useEffect(() => {
    if (hydrated && !lead) router.replace('/email');
  }, [hydrated, lead, router]);

  if (!hydrated || !lead) return null;

  const buy = async () => {
    setBusy(true);
    setError(null);
    try {
      const checkout = await createMomoSubscriptionCheckout(lead.web_user_id, 'monthly');
      setMomoOrderId(checkout.order_id);
      trackEvent('checkout_started_client', { provider: 'momo', plan_id: 'monthly' });
      window.location.assign(checkout.pay_url);
    } catch {
      setError(vi.paywall.paymentError);
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col justify-center gap-5 px-5 py-8">
      <div className="rounded-3xl bg-forest p-5 text-white shadow-sm animate-soft-enter">
        <div className="text-sm font-semibold opacity-80">{vi.paywall.eyebrow}</div>
        <h1 className="mt-2 text-3xl font-extrabold">{vi.paywall.headline}</h1>
      </div>

      <div className="rounded-2xl border-2 border-teal-brand bg-mist px-5 py-4 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-extrabold text-forest">{vi.paywall.planName}</h2>
            <p className="mt-1 text-sm text-muted-brand">{vi.paywall.planNote}</p>
          </div>
          <div className="text-right font-extrabold text-forest">{vi.paywall.planPrice}</div>
        </div>
      </div>

      <ul className="flex flex-col gap-2">
        {vi.paywall.bullets.map((b) => (
          <li key={b} className="flex items-center gap-2 text-slate-brand">
            <span className="text-success-brand">✓</span> {b}
          </li>
        ))}
      </ul>

      {error && (
        <p className="text-sm font-medium text-error-brand" role="alert">
          {error}
        </p>
      )}

      <PrimaryButton disabled={busy} onClick={buy}>
        {busy ? vi.paywall.loading : vi.paywall.cta}
      </PrimaryButton>
    </main>
  );
}
