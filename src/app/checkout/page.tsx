'use client';

import { useEffect, useRef, useState } from 'react';
import Script from 'next/script';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { useRouter } from 'next/navigation';
import { trackEvent, trackStepViewed } from '@/lib/analytics/track';
import { useCopy } from '@/lib/copy/use-copy';
import { formatOfferAmount } from '@/lib/funnel/catalog';
import { useHydrated, useQuizStore } from '@/lib/quiz/store';

type PayPalActions = {
  subscription: { create: (data: { plan_id: string; custom_id: string }) => Promise<string> | string };
};

type PayPalButtons = {
  render: (container: string) => Promise<void> | void;
};

declare global {
  interface Window {
    paypal?: {
      Buttons: (config: {
        createSubscription: (_data: unknown, actions: PayPalActions) => Promise<string> | string;
        onApprove: (data: { subscriptionID?: string }) => void;
        onError: () => void;
      }) => PayPalButtons;
    };
  }
}

export default function CheckoutPage() {
  const router = useRouter();
  const copy = useCopy();
  const hydrated = useHydrated();
  const lead = useQuizStore((s) => s.lead);
  const checkout = useQuizStore((s) => s.paypalCheckout);
  const screenRef = useRef<HTMLElement>(null);
  const [sdkReady, setSdkReady] = useState(false);
  const [paymentState, setPaymentState] = useState<'idle' | 'error' | 'approved'>('idle');
  const paypalClientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;

  useEffect(() => trackStepViewed('paypal_checkout'), []);
  useEffect(() => {
    if (!hydrated) return;
    if (!lead) router.replace('/email');
    else if (!checkout) router.replace('/paywall');
  }, [checkout, hydrated, lead, router]);

  useGSAP(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    gsap.from('[data-checkout-reveal]', {
      y: 14,
      opacity: 0,
      duration: 0.42,
      stagger: 0.08,
      ease: 'power2.out',
    });
  }, { scope: screenRef });

  useEffect(() => {
    const paypalCheckout = checkout?.paypal;
    if (!sdkReady || !paypalCheckout || !window.paypal) return;
    const container = document.getElementById('paypal-button-container');
    if (!container || container.childElementCount > 0) return;
    window.paypal.Buttons({
      createSubscription: (_data, actions) => actions.subscription.create({
        plan_id: paypalCheckout.planId,
        custom_id: paypalCheckout.customId,
      }),
      onApprove: (data) => {
        setPaymentState('approved');
        trackEvent('paypal_subscription_approved', {
          checkout_id: checkout.checkoutId,
          subscription_id: data.subscriptionID ?? '',
        });
      },
      onError: () => setPaymentState('error'),
    }).render('#paypal-button-container');
  }, [checkout, sdkReady]);

  if (!hydrated || !lead || !checkout) return null;

  const todayAmount = formatOfferAmount(checkout.amountDueToday, checkout.currency);
  const standardAmount = formatOfferAmount(checkout.standardAmount, checkout.currency);
  const renewalAmount = formatOfferAmount(checkout.renewalAmount, checkout.currency);
  const scriptUrl = paypalClientId
    ? `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(paypalClientId)}&vault=true&intent=subscription&currency=${checkout.currency}`
    : null;

  return (
    <main ref={screenRef} className="min-h-dvh bg-[#f5f8f6] px-5 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top))] text-charcoal">
      {scriptUrl && <Script src={scriptUrl} strategy="afterInteractive" onReady={() => setSdkReady(true)} onError={() => setPaymentState('error')} />}
      <div className="mx-auto w-full max-w-[38rem]">
        <header data-checkout-reveal className="flex items-center justify-between border-b border-border-brand pb-6">
          <button type="button" onClick={() => router.push('/paywall')} className="min-h-11 px-1 text-sm font-bold text-emerald-deep transition hover:text-forest focus:outline-none focus-visible:ring-4 focus-visible:ring-teal-brand/20">{copy.checkout.close}</button>
          <div className="text-[1.55rem] font-extrabold tracking-[-0.05em] text-forest">Nut<span className="text-teal-brand">ree</span></div>
          <span aria-hidden="true" className="w-[5.8rem]" />
        </header>

        <section data-checkout-reveal className="py-8 sm:py-10">
          <h1 className="text-[2.4rem] font-extrabold leading-none tracking-[-0.05em] text-forest sm:text-[3.3rem]">{copy.checkout.title}</h1>
          <p className="mt-3 text-lg leading-relaxed text-slate-brand">{copy.checkout.methodBody}</p>
        </section>

        <section data-checkout-reveal aria-labelledby="order-summary" className="border-y border-border-brand py-6">
          <h2 id="order-summary" className="text-lg font-extrabold text-forest">{copy.checkout.orderTitle}</h2>
          <dl className="mt-5 grid gap-4 text-base">
            <div className="flex items-baseline justify-between gap-5"><dt className="text-slate-brand">{copy.checkout.plan} · {checkout.offerLabel}</dt><dd className="font-semibold text-forest">{standardAmount}</dd></div>
            <div className="flex items-baseline justify-between gap-5"><dt className="text-emerald-deep">{copy.checkout.discount}</dt><dd className="font-extrabold text-emerald-deep">-{formatOfferAmount(checkout.standardAmount - checkout.amountDueToday, checkout.currency)}</dd></div>
            <div className="flex items-baseline justify-between gap-5 border-t border-border-brand pt-4 text-xl"><dt className="font-extrabold text-forest">{copy.checkout.total}</dt><dd className="font-extrabold text-forest">{todayAmount}</dd></div>
            <div className="flex items-baseline justify-between gap-5 text-sm"><dt className="text-muted-brand">{copy.checkout.renewal}</dt><dd className="font-semibold text-slate-brand">{renewalAmount} · {checkout.renewalDescription}</dd></div>
          </dl>
        </section>

        <section data-checkout-reveal aria-labelledby="payment-method" className="py-8 sm:py-10">
          <h2 id="payment-method" className="text-lg font-extrabold text-forest">{copy.checkout.methodTitle}</h2>
          <div className="mt-5 rounded-2xl border border-border-brand bg-white p-5 shadow-[0_12px_30px_rgb(23_69_58_/_0.06)]">
            <div className="flex items-center justify-between gap-4 border-b border-border-brand pb-5"><span className="flex items-center gap-3 font-extrabold text-forest"><span className="h-3 w-3 rounded-full bg-teal-brand" />PayPal</span><span className="text-sm font-semibold text-muted-brand">{copy.paywall.providerLabel}</span></div>
            {paymentState === 'approved' ? <p role="status" className="py-6 text-center text-base font-bold leading-relaxed text-emerald-deep">{copy.checkout.approvalPending}</p> : scriptUrl ? <div id="paypal-button-container" className="min-h-12 pt-5" /> : <p role="alert" className="py-6 text-center text-sm font-bold text-error-brand">{copy.checkout.configurationMissing}</p>}
            {paymentState === 'error' && <p role="alert" className="pt-4 text-center text-sm font-bold text-error-brand">{copy.checkout.paymentError}</p>}
          </div>
        </section>

        <p data-checkout-reveal className="mx-auto max-w-lg border-t border-border-brand pt-5 text-center text-xs leading-relaxed text-muted-brand">{copy.checkout.security}</p>
      </div>
    </main>
  );
}
