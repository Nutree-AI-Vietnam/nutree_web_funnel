/** @vitest-environment jsdom */

import type { Offering, Package } from '@revenuecat/purchases-js';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PostcheckoutPageClient } from '@/app/(default)/postcheckout/postcheckout-page-client';
import { copyFor } from '@/lib/copy';
import { useQuizStore } from '@/lib/quiz/store';
import { readCheckoutMethod, rememberCheckoutMethod, saveCheckoutEmail } from '@/lib/revenuecat/checkout-email';
import { PaywallPageClient } from './paywall-page-client';

const purchases = vi.hoisted(() => ({ getOfferings: vi.fn(), purchase: vi.fn(), preload: vi.fn(async () => undefined), getAppUserId: () => '$RCAnonymousID:test' }));

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }) }));
vi.mock('next/image', () => ({ default: ({ alt }: { alt: string }) => <span role="img" aria-label={alt} /> }));
vi.mock('@/lib/analytics/track', () => ({ trackEvent: vi.fn(), trackStepViewed: vi.fn() }));
vi.mock('@/lib/analytics/posthog', () => ({ identifyFunnelLead: vi.fn() }));
// jsdom runs on localhost, which the paywall treats as the local preview without RevenueCat.
vi.mock('@/lib/local-preview', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/local-preview')>()),
  isLocalPreviewHost: () => false,
}));
vi.mock('@/lib/revenuecat/attribution-attributes', () => ({ syncRevenueCatAttribution: vi.fn(async () => undefined) }));
vi.mock('@/lib/revenuecat/web', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/revenuecat/web')>()),
  readRevenueCatWebConfig: () => ({ apiKey: 'rc_test', offeringIdentifier: 'web_default' }),
  configureRevenueCatForAnonymousCheckout: () => ({ appUserId: '$RCAnonymousID:test', purchases }),
}));

const copy = copyFor('en');
const payUrl = 'https://test-payment.momo.vn/v2/gateway/pay?t=1';
const sixMonth = {
  identifier: '$rc_six_month',
  webBillingProduct: {
    title: 'Nutree 24 Weeks',
    description: null,
    period: { number: 6, unit: 'month' },
    price: { amountMicros: 1_599_000_000_000, currency: 'VND', formattedPrice: '1.599.000 ₫' },
    introPricePhase: null,
  },
} as unknown as Package;
const offering = { identifier: 'web_default', metadata: null, availablePackages: [sixMonth] } as unknown as Offering;
// The passes follow the card plans: the 24-week card plan is paid by the 24-week pass.
const momoQuotes = [
  { plan: 'weekly', weeks: 1, amount: 39_000, regular_amount: 79_000, intro: true },
  { plan: 'monthly', weeks: 4, amount: 99_000, regular_amount: 199_000, intro: true },
  { plan: 'six_month', weeks: 24, amount: 799_000, regular_amount: 1_599_000, intro: true },
];

const cardCta = copy.funnel.paywall.ctaFallback;

// jsdom has neither; the paywall's reveal animations and scratch card only need them to exist.
class NoopObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() { return []; }
}

function renderPaywall(countryCode = 'VN') {
  render(<PaywallPageClient initialCountryCode={countryCode} exitOfferMode={false} />);
}

/** Taps the plan box's buy button once the prices are in, which opens the checkout sheet. */
async function planBox() {
  await waitFor(() => expect(document.getElementById('plans')).not.toBeNull());
  return document.getElementById('plans')!;
}

async function openCheckout() {
  const cta = await within(await planBox()).findByRole('button', { name: cardCta });
  await waitFor(() => expect((cta as HTMLButtonElement).disabled).toBe(false));
  fireEvent.click(cta);
  return screen.findByRole('dialog', { name: copy.funnel.paywall.checkout.title });
}

describe('paywall checkout method', () => {
  let rejectPurchase: (error: Error) => void = () => {};
  const assign = vi.fn();

  beforeEach(async () => {
    sessionStorage.clear();
    await useQuizStore.persist.rehydrate();
    useQuizStore.getState().reset();
    useQuizStore.getState().setLocale('en');
    useQuizStore.getState().setLead({ lead_id: 'lead-1', masked_email: 'b***@example.com', status: 'payment_pending' });
    saveCheckoutEmail('buyer@example.com');
    purchases.getOfferings.mockResolvedValue({ all: { web_default: offering } });
    // Created on call, so a test that never opens the card checkout leaves no promise to reject.
    rejectPurchase = () => {};
    purchases.purchase.mockClear();
    purchases.purchase.mockImplementation(() => new Promise((_, reject) => { rejectPurchase = reject; }));
    assign.mockClear();
    vi.stubGlobal('location', { ...window.location, assign });
    vi.stubGlobal('IntersectionObserver', NoopObserver);
    vi.stubGlobal('ResizeObserver', NoopObserver);
    vi.stubGlobal('fetch', vi.fn(async (url: string) => (url.startsWith('/api/web-funnel/momo/plans')
      ? Response.json({ plans: momoQuotes })
      : Response.json({ order_id: 'a'.repeat(32), pay_url: payUrl, amount: 799_000 }, { status: 201 }))));
  });

  afterEach(() => {
    rejectPurchase(new Error('Checkout closed'));
    cleanup();
    vi.unstubAllGlobals();
    useQuizStore.getState().setLocale('vi');
  });

  it('keeps one plan list on the page and asks how to pay in the checkout sheet', async () => {
    renderPaywall();
    await within(await planBox()).findByRole('button', { name: cardCta });
    expect(screen.queryByRole('radiogroup', { name: copy.momoCheckout.methodLabel })).toBeNull();

    const sheet = await openCheckout();
    const methods = within(sheet).getByRole('radiogroup', { name: copy.momoCheckout.methodLabel });
    expect(within(methods).getAllByRole('radio').map((option) => option.getAttribute('aria-checked'))).toEqual(['true', 'false', 'false']);
    expect(within(sheet).getByRole('button', { name: /Pay 799\.000đ with MoMo/ })).toBeTruthy();
  });

  it('pays the picked plan with its MoMo pass without recording a card checkout', async () => {
    renderPaywall();
    const sheet = await openCheckout();

    fireEvent.click(await within(sheet).findByRole('button', { name: /Pay 799\.000đ with MoMo/ }));

    await waitFor(() => expect(assign).toHaveBeenCalledWith(payUrl));
    expect(readCheckoutMethod()).toBeNull();
    const { trackEvent } = await import('@/lib/analytics/track');
    expect(trackEvent).not.toHaveBeenCalledWith('revenuecat_checkout_started', expect.anything());
  });

  it('gives a buyer who leaves MoMo unpaid and then pays by card the card redemption guidance', async () => {
    renderPaywall();
    let sheet = await openCheckout();
    fireEvent.click(await within(sheet).findByRole('button', { name: /Pay 799\.000đ with MoMo/ }));
    await waitFor(() => expect(assign).toHaveBeenCalledWith(payUrl));
    expect(readCheckoutMethod()).toBeNull();

    // The buyer taps "Quay về" on MoMo's page and comes back to the paywall in the same tab.
    cleanup();
    renderPaywall();
    sheet = await openCheckout();
    fireEvent.click(within(sheet).getByRole('radio', { name: new RegExp(copy.momoCheckout.cardLabel) }));

    await waitFor(() => expect(purchases.purchase).toHaveBeenCalled());
    await waitFor(() => expect(readCheckoutMethod()).toBe('paddle'));

    // Once the card purchase is correlated, post-checkout keeps the redemption-email guidance.
    cleanup();
    render(<PostcheckoutPageClient />);
    expect(await screen.findByRole('heading', { name: copy.funnel.postcheckout.title })).toBeTruthy();
    expect(screen.queryByRole('heading', { name: copy.momoCheckout.paidHeadline })).toBeNull();
  });

  it('records a card checkout as paddle once the card form shows, replacing the mark of an earlier paid MoMo order', async () => {
    // A MoMo pass was paid in this tab for an earlier lead; this lead pays by card.
    rememberCheckoutMethod('momo');
    renderPaywall();
    const sheet = await openCheckout();
    // The sheet opens on MoMo, so the card checkout behind it is not the buyer's yet.
    await within(sheet).findByRole('button', { name: /Pay 799\.000đ with MoMo/ });
    expect(readCheckoutMethod()).toBe('momo');

    fireEvent.click(within(sheet).getByRole('radio', { name: new RegExp(copy.momoCheckout.cardLabel) }));

    await waitFor(() => expect(readCheckoutMethod()).toBe('paddle'));
    expect(purchases.purchase).toHaveBeenCalledTimes(1);
  });

  it('shows only the card checkout outside Vietnam', async () => {
    renderPaywall('US');
    const sheet = await openCheckout();

    expect(within(sheet).queryByRole('radiogroup', { name: copy.momoCheckout.methodLabel })).toBeNull();
    expect(within(sheet).queryByRole('button', { name: /MoMo/ })).toBeNull();
    await waitFor(() => expect(readCheckoutMethod()).toBe('paddle'));
  });
});
