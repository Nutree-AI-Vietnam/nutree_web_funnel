'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Package } from '@revenuecat/purchases-js';
import { PrimaryButton } from '@/components/primary-button';
import { trackEvent, trackStepViewed } from '@/lib/analytics/track';
import { getPackages, purchasePackage } from '@/lib/billing/revenuecat';
import { vi } from '@/lib/copy/vi';
import { useHydrated, useQuizStore } from '@/lib/quiz/store';

export default function PaywallPage() {
  const router = useRouter();
  const hydrated = useHydrated();
  const lead = useQuizStore((s) => s.lead);
  const setPurchased = useQuizStore((s) => s.setPurchased);
  const [packages, setPackages] = useState<Package[] | null>(null);
  const [selected, setSelected] = useState<Package | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => trackStepViewed('paywall'), []);

  useEffect(() => {
    if (!hydrated) return;
    if (!lead) {
      router.replace('/email');
      return;
    }
    getPackages(lead.web_user_id)
      .then((pkgs) => {
        setPackages(pkgs);
        setSelected(pkgs[0] ?? null);
      })
      .catch(() => setError(vi.paywall.error));
  }, [hydrated, lead, router]);

  if (!hydrated || !lead) return null;

  const buy = async () => {
    if (!selected) return;
    setBusy(true);
    setError(null);
    try {
      const entitled = await purchasePackage(lead.web_user_id, selected, lead.email);
      if (entitled) {
        setPurchased(true);
        trackEvent('checkout_completed_client', {});
        router.push('/success');
      } else {
        setError(vi.paywall.paymentError);
      }
    } catch {
      setError(vi.paywall.paymentError);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col justify-center gap-5 px-5 py-8">
      <div className="rounded-3xl bg-forest p-5 text-white shadow-sm animate-soft-enter">
        <div className="text-sm font-semibold opacity-80">{vi.paywall.eyebrow}</div>
        <h1 className="mt-2 text-3xl font-extrabold">{vi.paywall.headline}</h1>
      </div>
      <ul className="flex flex-col gap-2">
        {vi.paywall.bullets.map((b) => (
          <li key={b} className="flex items-center gap-2 text-slate-brand">
            <span className="text-success-brand">✓</span> {b}
          </li>
        ))}
      </ul>

      {!packages && !error && <p className="text-muted-brand">{vi.paywall.loading}</p>}

      {packages && (
        <div className="flex flex-col gap-3">
          {packages.map((pkg) => {
            const isSelected = selected?.identifier === pkg.identifier;
            const isAnnual = pkg.identifier.toLowerCase().includes('annual');
            return (
              <button
                key={pkg.identifier}
                type="button"
                onClick={() => setSelected(pkg)}
                aria-pressed={isSelected}
                className={`min-h-20 rounded-2xl border-2 px-5 py-4 text-left shadow-sm transition duration-150 active:scale-[0.99] ${
                  isSelected
                    ? 'border-teal-brand bg-mist ring-2 ring-teal-brand/15'
                    : 'border-border-brand bg-white hover:border-teal-brand/50'
                }`}
              >
                <span className="flex items-start justify-between gap-3">
                  <span>
                    <span className="block font-semibold text-forest">
                      {pkg.webBillingProduct.title}
                    </span>
                    {isAnnual && (
                      <span className="mt-1 inline-flex rounded-full bg-teal-brand px-2 py-0.5 text-xs font-bold text-white">
                        {vi.paywall.recommended}
                      </span>
                    )}
                  </span>
                  <span className="font-bold text-forest">
                    {pkg.webBillingProduct.currentPrice.formattedPrice}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      )}

      {error && (
        <p className="text-sm font-medium text-error-brand" role="alert">
          {error}
        </p>
      )}

      <PrimaryButton disabled={!selected || busy} onClick={buy}>
        {busy ? '...' : vi.paywall.cta}
      </PrimaryButton>
    </main>
  );
}
