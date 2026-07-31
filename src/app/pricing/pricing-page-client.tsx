'use client';

import { initializePaddle, type Paddle, type PricePreviewResponse } from '@paddle/paddle-js';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { trackEvent, trackStepViewed } from '@/lib/analytics/track';
import { readPaddleClientConfig } from '@/lib/paddle/env';
import { type BillingPeriod, pricingTiers, type Tier } from '@/lib/paddle/pricing-tiers';
import { useHydrated, useQuizStore } from '@/lib/quiz/store';
import { cn } from '@/lib/utils';

interface PricingPageClientProps {
  initialCountryCode?: string;
}

type LoadState = 'idle' | 'loading' | 'ready' | 'error';

type PriceById = Record<string, {
  total: string;
  currencyCode: string;
}>;

const billingLabels: Record<BillingPeriod, string> = {
  month: 'Monthly',
  year: 'Annual',
};

function mapPreviewPrices(preview: PricePreviewResponse): PriceById {
  return Object.fromEntries(
    preview.data.details.lineItems.map((lineItem) => [
      lineItem.price.id,
      {
        total: lineItem.formattedTotals.total,
        currencyCode: preview.data.currencyCode,
      },
    ]),
  );
}

function priceForTier(tier: Tier, billing: BillingPeriod, prices: PriceById) {
  return prices[tier.priceId[billing]]?.total;
}

export function PricingPageClient({ initialCountryCode }: PricingPageClientProps) {
  const hydrated = useHydrated();
  const lead = useQuizStore((state) => state.lead);
  const [billing, setBilling] = useState<BillingPeriod>('month');
  const [paddle, setPaddle] = useState<Paddle | null>(null);
  const [prices, setPrices] = useState<PriceById>({});
  const [loadState, setLoadState] = useState<LoadState>('idle');
  const [checkoutPriceId, setCheckoutPriceId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const selectedPriceIds = useMemo(
    () => Array.from(new Set(pricingTiers.map((tier) => tier.priceId[billing]))),
    [billing],
  );

  useEffect(() => trackStepViewed('paddle_pricing'), []);

  useEffect(() => {
    let cancelled = false;

    async function loadPaddle() {
      try {
        const config = readPaddleClientConfig();
        const instance = await initializePaddle({
          token: config.token,
          ...(config.environment === 'sandbox' ? { environment: 'sandbox' as const } : {}),
        });

        if (!cancelled) {
          if (!instance) throw new Error('Paddle.js did not return an initialized instance.');
          setPaddle(instance);
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(error instanceof Error ? error.message : 'Unable to initialize Paddle.');
          setLoadState('error');
        }
      }
    }

    loadPaddle();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const paddleInstance = paddle;
    if (!paddleInstance) return;

    let cancelled = false;

    async function loadPrices(instance: Paddle) {
      setLoadState('loading');
      setErrorMessage(null);

      try {
        const preview = await instance.PricePreview({
          items: selectedPriceIds.map((priceId) => ({ priceId, quantity: 1 })),
          ...(initialCountryCode ? { address: { countryCode: initialCountryCode } } : {}),
        });

        if (!cancelled) {
          setPrices(mapPreviewPrices(preview));
          setLoadState('ready');
        }
      } catch {
        if (!cancelled) {
          setLoadState('error');
          setErrorMessage('Paddle could not preview prices for this visitor. Check the client-side token and price IDs.');
        }
      }
    }

    loadPrices(paddleInstance);

    return () => {
      cancelled = true;
    };
  }, [initialCountryCode, paddle, selectedPriceIds]);

  const openCheckout = (tier: Tier) => {
    if (!paddle) {
      setErrorMessage('Paddle is still loading. Please try again in a moment.');
      return;
    }

    const priceId = tier.priceId[billing];
    setCheckoutPriceId(priceId);
    setErrorMessage(null);
    trackEvent('paddle_checkout_started', {
      tier: tier.name,
      billing,
      price_id: priceId,
      country_code: initialCountryCode ?? 'auto',
    });

    const customer = hydrated && lead?.email
      ? {
          email: lead.email,
          ...(initialCountryCode ? { address: { countryCode: initialCountryCode } } : {}),
        }
      : undefined;

    try {
      paddle.Checkout.open({
        items: [{ priceId, quantity: 1 }],
        settings: {
          displayMode: 'overlay',
          variant: 'one-page',
          successUrl: `${window.location.origin}/welcome`,
        },
        customer,
        customData: {
          source: 'nutree_web_pricing',
          tier: tier.name,
          billing,
        },
      });
    } catch {
      setErrorMessage('Paddle could not open checkout. Check the checkout domain and default payment link.');
    } finally {
      window.setTimeout(() => {
        setCheckoutPriceId((currentPriceId) => (currentPriceId === priceId ? null : currentPriceId));
      }, 1500);
    }
  };

  const regionNote = initialCountryCode
    ? `Pricing preview uses your detected billing country: ${initialCountryCode}.`
    : 'Pricing preview lets Paddle auto-detect your location from your IP.';

  return (
    <main className="min-h-dvh overflow-hidden bg-[#f6faf7] text-charcoal">
      <div className="absolute inset-x-0 top-0 -z-0 h-80 bg-[radial-gradient(circle_at_50%_0%,rgba(40,191,164,0.20),transparent_58%)]" />
      <section className="relative z-10 mx-auto flex min-h-dvh w-full max-w-6xl flex-col px-5 py-[max(1.5rem,env(safe-area-inset-top))] sm:px-6 lg:px-8">
        <nav className="flex items-center justify-between">
          <Link href="/" className="text-[1.55rem] font-extrabold tracking-[-0.05em] text-forest">
            Nut<span className="text-teal-brand">ree</span>
          </Link>
          <Link href="/quiz/goal" className="rounded-full border border-border-brand bg-white/80 px-4 py-2 text-sm font-extrabold text-emerald-deep shadow-sm transition hover:border-teal-brand/50">
            Take quiz
          </Link>
        </nav>

        <header className="mx-auto max-w-3xl pt-16 text-center sm:pt-20">
          <p className="text-sm font-extrabold uppercase tracking-[0.22em] text-teal-brand">Nutree Premium</p>
          <h1 className="mt-4 text-[clamp(2.65rem,8vw,5.5rem)] font-extrabold leading-[0.95] tracking-[-0.07em] text-forest">
            Choose the support level that fits your nutrition rhythm.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base font-semibold leading-relaxed text-slate-brand sm:text-lg">
            Paddle calculates the exact localized checkout total. We display Paddle&apos;s returned total directly — no browser-side currency math.
          </p>

          <div className="mx-auto mt-8 inline-flex rounded-full border border-border-brand bg-white p-1 shadow-[0_12px_32px_rgb(23_69_58_/_0.08)]">
            {(['month', 'year'] as const).map((period) => (
              <button
                key={period}
                type="button"
                onClick={() => setBilling(period)}
                aria-pressed={billing === period}
                className={cn(
                  'min-h-11 rounded-full px-5 text-sm font-extrabold transition focus:outline-none focus-visible:ring-4 focus-visible:ring-teal-brand/20',
                  billing === period
                    ? 'bg-forest text-white shadow-sm'
                    : 'text-slate-brand hover:bg-mist/70 hover:text-forest',
                )}
              >
                {billingLabels[period]}
              </button>
            ))}
          </div>
        </header>

        <div className="mt-10 grid gap-4 lg:grid-cols-3">
          {pricingTiers.map((tier) => {
            const activePriceId = tier.priceId[billing];
            const shownPrice = priceForTier(tier, billing, prices);
            const featured = tier.name === 'Pro';
            const buttonBusy = checkoutPriceId === activePriceId;

            return (
              <article
                key={tier.name}
                className={cn(
                  'relative flex min-h-[33rem] flex-col rounded-[2rem] border bg-white p-6 shadow-[0_20px_54px_rgb(23_69_58_/_0.08)]',
                  featured ? 'border-teal-brand ring-4 ring-teal-brand/10' : 'border-border-brand',
                )}
              >
                {tier.badge && (
                  <span className="absolute right-5 top-5 rounded-full bg-[#ff6a31] px-3 py-1 text-xs font-extrabold uppercase tracking-[0.12em] text-white">
                    {tier.badge}
                  </span>
                )}
                <div className="pr-24">
                  <h2 className="text-2xl font-extrabold tracking-[-0.04em] text-forest">{tier.name}</h2>
                  <p className="mt-3 text-sm font-semibold leading-relaxed text-slate-brand">{tier.description}</p>
                </div>

                <div className="mt-8 border-y border-border-brand py-6">
                  <div className="flex min-h-14 items-end gap-2">
                    <span className="text-[2.8rem] font-extrabold leading-none tracking-[-0.06em] text-forest">
                      {loadState === 'ready' && shownPrice ? shownPrice : '—'}
                    </span>
                    <span className="pb-1.5 text-sm font-bold text-muted-brand">/{billing === 'month' ? 'mo' : 'yr'}</span>
                  </div>
                  <p className="mt-3 text-xs font-semibold leading-relaxed text-muted-brand">
                    {loadState === 'loading' ? 'Loading live Paddle price…' : regionNote}
                  </p>
                </div>

                <ul className="mt-6 grid gap-3 text-sm font-semibold leading-relaxed text-slate-brand">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex gap-3">
                      <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-teal-brand/12 text-[0.7rem] font-extrabold text-teal-brand">✓</span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  type="button"
                  disabled={loadState !== 'ready' || !shownPrice}
                  onClick={() => openCheckout(tier)}
                  className={cn(
                    'mt-auto min-h-12 rounded-full px-5 text-sm font-extrabold transition focus:outline-none focus-visible:ring-4 focus-visible:ring-teal-brand/25 disabled:cursor-not-allowed disabled:opacity-60',
                    featured
                      ? 'bg-[linear-gradient(135deg,#28bfa4,#1c5546)] text-white shadow-[0_12px_28px_rgb(40_191_164_/_0.24)] hover:brightness-105'
                      : 'bg-forest text-white hover:bg-emerald-deep',
                  )}
                >
                  {buttonBusy ? 'Opening checkout…' : `Subscribe to ${tier.name}`}
                </button>
              </article>
            );
          })}
        </div>

        <div className="mx-auto mt-6 max-w-3xl text-center">
          {errorMessage && (
            <p role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
              {errorMessage}
            </p>
          )}
          <p className="mt-4 text-xs font-semibold leading-relaxed text-muted-brand">
            Secure checkout is powered by Paddle. Taxes and localized totals are calculated by Paddle before checkout opens.
          </p>
        </div>
      </section>
    </main>
  );
}
