'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ConversionShell } from '@/components/conversion-shell';
import { PrimaryButton } from '@/components/primary-button';
import { GlowingCard } from '@/components/ui/glowing-card';
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
    <ConversionShell className="gap-4">
      <div className="rounded-3xl bg-forest-dark p-5 text-white shadow-[0_24px_70px_rgb(15_31_26_/_0.20)]">
        <div className="h-1 w-16 rounded-full bg-teal-brand" />
        <h1 className="mt-2 text-3xl font-extrabold leading-tight">{vi.paywall.headline}</h1>
        <p className="mt-3 text-sm font-semibold text-white/68">{vi.paywall.eyebrow}</p>
      </div>

      <GlowingCard active className="rounded-2xl">
        <div className="px-5 py-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-extrabold text-forest">{vi.paywall.planName}</h2>
              <p className="mt-1 text-sm text-muted-brand">{vi.paywall.planNote}</p>
            </div>
            <div className="text-right font-extrabold text-forest">{vi.paywall.planPrice}</div>
          </div>
        </div>
      </GlowingCard>

      <ul className="flex flex-col gap-2">
        {vi.paywall.bullets.map((b) => (
          <li key={b} className="flex items-center gap-3 rounded-2xl bg-white/72 px-4 py-3 font-semibold text-slate-brand shadow-sm backdrop-blur">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-success-brand text-xs text-white">✓</span>
            {b}
          </li>
        ))}
      </ul>

      {error && (
        <p className="text-sm font-medium text-error-brand" role="alert">
          {error}
        </p>
      )}

      <div>
        <PrimaryButton disabled={busy} onClick={buy}>
          {busy ? vi.paywall.loading : vi.paywall.cta}
        </PrimaryButton>
      </div>
    </ConversionShell>
  );
}
