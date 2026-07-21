'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PrimaryButton } from '@/components/primary-button';
import { BackgroundBeams } from '@/components/ui/background-beams';
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
    <main className="relative mx-auto flex min-h-dvh w-full max-w-lg flex-col justify-center gap-5 overflow-hidden px-5 py-8">
      <BackgroundBeams />
      <div className="relative z-10 rounded-3xl bg-forest-dark p-5 text-white shadow-[0_24px_70px_rgb(15_31_26_/_0.20)] animate-soft-enter">
        <div className="text-sm font-semibold text-teal-brand">{vi.paywall.eyebrow}</div>
        <h1 className="mt-2 text-3xl font-extrabold leading-tight">{vi.paywall.headline}</h1>
      </div>

      <GlowingCard active className="relative z-10 rounded-2xl">
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

      <ul className="relative z-10 flex flex-col gap-2">
        {vi.paywall.bullets.map((b) => (
          <li key={b} className="flex items-center gap-3 rounded-2xl bg-white/72 px-4 py-3 text-slate-brand shadow-sm backdrop-blur">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-success-brand text-xs text-white">✓</span>
            {b}
          </li>
        ))}
      </ul>

      {error && (
        <p className="relative z-10 text-sm font-medium text-error-brand" role="alert">
          {error}
        </p>
      )}

      <div className="relative z-10">
        <PrimaryButton disabled={busy} onClick={buy}>
          {busy ? vi.paywall.loading : vi.paywall.cta}
        </PrimaryButton>
      </div>
    </main>
  );
}
