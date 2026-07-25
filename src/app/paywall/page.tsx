'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ConversionShell } from '@/components/conversion-shell';
import { PrimaryButton } from '@/components/primary-button';
import { createCheckout, getFunnelContext } from '@/lib/api/client';
import { trackEvent, trackStepViewed } from '@/lib/analytics/track';
import { useCopy } from '@/lib/copy/use-copy';
import { createFallbackFunnelContext, formatOfferAmount, getRecommendedOffer } from '@/lib/funnel/catalog';
import type { FunnelContext, FunnelOffer } from '@/lib/quiz/types';
import { useHydrated, useQuizStore } from '@/lib/quiz/store';
import { cn } from '@/lib/utils';

const countryName = (country: string) => {
  if (country.toUpperCase() === 'VN') return 'Việt Nam';
  if (country.toUpperCase() === 'US') return 'United States';
  return country.toUpperCase();
};

export default function PaywallPage() {
  const router = useRouter();
  const copy = useCopy();
  const hydrated = useHydrated();
  const lead = useQuizStore((s) => s.lead);
  const data = useQuizStore((s) => s.data);
  const setMomoOrderId = useQuizStore((s) => s.setMomoOrderId);
  const [context, setContext] = useState<FunnelContext>(() => createFallbackFunnelContext());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => trackStepViewed('paywall'), []);

  useEffect(() => {
    if (!hydrated) return;
    if (!lead) {
      router.replace('/email');
      return;
    }
    getFunnelContext()
      .then((next) => {
        setContext(next);
        setSelectedId(getRecommendedOffer(next.offers).id);
      })
      .catch(() => {
        const fallback = createFallbackFunnelContext();
        setContext(fallback);
        setSelectedId(getRecommendedOffer(fallback.offers).id);
      });
  }, [hydrated, lead, router]);

  const selected = useMemo<FunnelOffer>(() => {
    const offer = context.offers.find((item) => item.id === selectedId);
    return offer ?? getRecommendedOffer(context.offers);
  }, [context.offers, selectedId]);

  if (!hydrated || !lead) return null;

  const name = data.name?.trim() || copy.paywall.fallbackName;
  const providerName = context.provider === 'MOMO' ? 'MoMo' : 'PayPal';
  const country = countryName(context.billing_country);
  const todayAmount = formatOfferAmount(selected.amount_due_today, selected.currency);
  const standardAmount = formatOfferAmount(selected.standard_amount, selected.currency);
  const renewalAmount = formatOfferAmount(selected.renewal_amount, selected.currency);
  const providerLabel =
    context.provider === 'MOMO' ? copy.paywall.providerLabel(country) : copy.paywall.paypalLabel(country);

  const changeCountry = () => {
    const nextCountry = context.market === 'VN' ? 'US' : 'VN';
    const next = createFallbackFunnelContext(nextCountry);
    setContext(next);
    setSelectedId(getRecommendedOffer(next.offers).id);
    setError(null);
    trackEvent('billing_country_changed', {
      market: next.market,
      provider: next.provider.toLowerCase(),
    });
  };

  const buy = async () => {
    setBusy(true);
    setError(null);
    trackEvent('checkout_started', {
      provider: context.provider.toLowerCase(),
      offer_id: selected.id,
      market: context.market,
    });

    try {
      const checkout = await createCheckout({
        leadId: lead.lead_id ?? lead.web_user_id,
        offer: selected,
        billingCountry: context.billing_country,
      });

      if (checkout.provider === 'MOMO' && checkout.momo) {
        setMomoOrderId(checkout.momo.orderId);
        const mobileTarget = checkout.momo.deeplink || checkout.momo.payUrl;
        window.location.assign(mobileTarget);
        return;
      }

      if (checkout.provider === 'PAYPAL' && checkout.paypal) {
        trackEvent('provider_approval_completed', {
          provider: 'paypal',
          offer_id: checkout.offerId,
        });
      }
    } catch {
      setError(copy.paywall.error);
    } finally {
      setBusy(false);
    }
  };

  return (
    <ConversionShell className="gap-5">
      <header className="rounded-[1.5rem] border border-border-brand bg-white/94 p-5 shadow-[0_18px_55px_rgb(16_39_32_/_0.08)]">
        <h1 className="text-[2rem] font-extrabold leading-[1.12] text-forest">
          {copy.paywall.headline(name)}
        </h1>
        <p className="mt-3 text-base font-semibold leading-relaxed text-slate-brand">{copy.paywall.subhead}</p>
        <div className="mt-5 rounded-2xl border border-teal-brand/20 bg-mist px-4 py-3 text-sm font-extrabold text-forest">
          {copy.paywall.rewardBanner}
        </div>
      </header>

      <section className="rounded-[1.5rem] border border-border-brand bg-white/88 p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-extrabold text-forest">{providerLabel}</p>
          <button
            type="button"
            onClick={changeCountry}
            className="min-h-11 self-start rounded-2xl border border-border-brand px-4 text-sm font-bold text-emerald-deep transition hover:bg-mist focus:outline-none focus-visible:ring-4 focus-visible:ring-teal-brand/20 active:scale-[0.98] sm:self-auto"
          >
            {copy.paywall.countryChange}
          </button>
        </div>
      </section>

      <section role="radiogroup" aria-label={copy.paywall.selectPlanAria} className="grid gap-3">
        {context.offers.map((offer) => {
          const active = offer.id === selected.id;
          const offerToday = formatOfferAmount(offer.amount_due_today, offer.currency);
          const offerStandard = formatOfferAmount(offer.standard_amount, offer.currency);
          const offerRenewal = formatOfferAmount(offer.renewal_amount, offer.currency);
          return (
            <button
              key={offer.id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => {
                setSelectedId(offer.id);
                trackEvent('offer_selected', { offer_id: offer.id, market: offer.market });
              }}
              className={cn(
                'relative min-h-28 rounded-[1.5rem] border bg-white p-4 text-left shadow-sm transition duration-200 focus:outline-none focus-visible:ring-4 focus-visible:ring-teal-brand/20 active:scale-[0.99]',
                active ? 'border-teal-brand shadow-[0_12px_34px_rgb(31_168_146_/_0.14)]' : 'border-border-brand hover:bg-bg-brand',
              )}
            >
              <span className="flex items-start justify-between gap-3">
                <span>
                  <span className="text-lg font-extrabold text-forest">{offer.label}</span>
                  <span className="mt-1 block text-sm font-semibold text-muted-brand">{offer.description}</span>
                </span>
                {offer.recommended && (
                  <span className="rounded-full bg-forest px-3 py-1 text-xs font-extrabold text-white">
                    {copy.paywall.recommendedTag}
                  </span>
                )}
              </span>

              <span className="mt-4 grid grid-cols-3 gap-2 text-sm">
                <span>
                  <span className="block font-bold text-muted-brand">{copy.paywall.standardPrice}</span>
                  <span className="font-extrabold text-slate-brand line-through">{offerStandard}</span>
                </span>
                <span>
                  <span className="block font-bold text-muted-brand">{copy.paywall.todayPrice}</span>
                  <span className="font-extrabold text-forest">{offerToday}</span>
                </span>
                <span>
                  <span className="block font-bold text-muted-brand">{copy.paywall.renewal}</span>
                  <span className="font-extrabold text-forest">{offerRenewal}</span>
                </span>
              </span>
              <span className="mt-3 block text-xs font-bold text-muted-brand">{offer.renewal_description}</span>
            </button>
          );
        })}
      </section>

      <section className="rounded-[1.5rem] border border-border-brand bg-white/88 p-4">
        <h2 className="text-base font-extrabold text-forest">{copy.paywall.lockNote}</h2>
        <ul className="mt-3 grid gap-2">
          {copy.paywall.bullets.map((item) => (
            <li key={item} className="rounded-2xl bg-bg-brand px-4 py-3 text-sm font-bold text-slate-brand">
              {item}
            </li>
          ))}
        </ul>
      </section>

      {context.provider === 'PAYPAL' && (
        <section className="rounded-[1.5rem] border border-border-brand bg-white/88 p-4 text-center">
          <p className="text-sm font-extrabold text-forest">
            {copy.paywall.paypalSummary(todayAmount, selected.renewal_description)}
          </p>
          <p className="mt-2 text-xs font-semibold text-muted-brand">
            {copy.paywall.paypalPlaceholder}
          </p>
        </section>
      )}

      {error && (
        <p className="rounded-2xl bg-white px-4 py-3 text-sm font-bold text-error-brand" role="alert">
          {error}
        </p>
      )}

      <div className="sticky bottom-3 mt-auto flex flex-col gap-2 pt-1">
        <PrimaryButton disabled={busy} onClick={buy}>
          {busy ? copy.paywall.loading : copy.paywall.cta(todayAmount, providerName)}
        </PrimaryButton>
        <p className="text-center text-xs font-semibold leading-relaxed text-muted-brand">
          {copy.paywall.termsIntro} {copy.paywall.secure}
        </p>
        <p className="text-center text-xs font-bold text-forest">
          {copy.paywall.exactPriceSummary(standardAmount, todayAmount, renewalAmount)}
        </p>
      </div>
    </ConversionShell>
  );
}
