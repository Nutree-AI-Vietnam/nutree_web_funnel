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
const quarterly = {
  identifier: '$rc_three_month',
  webBillingProduct: {
    title: 'Nutree 12 Weeks',
    description: null,
    period: { number: 12, unit: 'week' },
    price: { amountMicros: 249_000_000_000, currency: 'VND', formattedPrice: '249.000 ₫' },
    introPricePhase: null,
  },
} as unknown as Package;
const offering = { identifier: 'web_default', metadata: null, availablePackages: [quarterly] } as unknown as Offering;
const momoQuotes = [
  { plan: 'monthly', weeks: 4, amount: 99_000, regular_amount: 198_000, intro: true },
  { plan: 'quarterly', weeks: 12, amount: 249_000, regular_amount: 498_000, intro: true },
  { plan: 'yearly', weeks: 52, amount: 599_000, regular_amount: 1_198_000, intro: true },
];

const cardCta = copy.funnel.paywall.ctaFallback;

// jsdom has neither; the paywall's reveal animations and scratch card only need them to exist.
class NoopObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() { return []; }
}

function renderPaywall() {
  render(<PaywallPageClient initialCountryCode="VN" exitOfferMode={false} />);
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
      : Response.json({ order_id: 'a'.repeat(32), pay_url: payUrl, amount: 249_000 }, { status: 201 }))));
  });

  afterEach(() => {
    rejectPurchase(new Error('Checkout closed'));
    cleanup();
    vi.unstubAllGlobals();
    useQuizStore.getState().setLocale('vi');
  });

  it('gives a buyer who leaves MoMo unpaid and then pays by card the card redemption guidance', async () => {
    renderPaywall();
    fireEvent.click(await screen.findByRole('button', { name: /Pay 249\.000đ with MoMo/ }));
    await waitFor(() => expect(assign).toHaveBeenCalledWith(payUrl));
    expect(readCheckoutMethod()).toBeNull();

    // The buyer taps "Quay về" on MoMo's page and comes back to the paywall in the same tab.
    cleanup();
    renderPaywall();
    fireEvent.click(await screen.findByRole('radio', { name: new RegExp(copy.momoCheckout.cardLabel) }));
    const cta = await within(document.getElementById('plans')!).findByRole('button', { name: cardCta });
    await waitFor(() => expect((cta as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(cta);

    await waitFor(() => expect(purchases.purchase).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(readCheckoutMethod()).toBe('paddle'));

    // Once the card purchase is correlated, post-checkout keeps the redemption-email guidance.
    cleanup();
    render(<PostcheckoutPageClient />);
    expect(await screen.findByRole('heading', { name: copy.funnel.postcheckout.title })).toBeTruthy();
    expect(screen.queryByRole('heading', { name: copy.momoCheckout.paidHeadline })).toBeNull();
  });

  it('keeps the card offer and its countdown out of the header while paying with MoMo', async () => {
    render(<PaywallPageClient initialCountryCode="VN" exitOfferMode />);
    const header = (await screen.findByRole('button', { name: copy.funnel.paywall.topCta })).parentElement!;

    expect(header.textContent).toContain(copy.momoCheckout.oneTime);
    expect(header.textContent).not.toContain(copy.funnel.paywall.exitHeader);
    expect(header.querySelector('[aria-live]')).toBeNull();

    fireEvent.click(screen.getByRole('radio', { name: new RegExp(copy.momoCheckout.cardLabel) }));

    await waitFor(() => expect(header.textContent).toContain(copy.funnel.paywall.exitHeader));
    expect(header.textContent).not.toContain(copy.momoCheckout.oneTime);
    expect(header.querySelector('[aria-live]')?.textContent).toMatch(/\d+:\d{2}/);
  });

  it('records a card checkout as paddle when it starts, replacing the mark of an earlier paid MoMo order', async () => {
    // A MoMo pass was paid in this tab for an earlier lead; this lead pays by card.
    rememberCheckoutMethod('momo');
    renderPaywall();
    fireEvent.click(await screen.findByRole('radio', { name: new RegExp(copy.momoCheckout.cardLabel) }));
    const cta = await within(document.getElementById('plans')!).findByRole('button', { name: cardCta });
    await waitFor(() => expect((cta as HTMLButtonElement).disabled).toBe(false));
    // A checkout started in the background, before the tap, is not yet the buyer's checkout.
    expect(readCheckoutMethod()).toBe('momo');

    fireEvent.click(cta);

    await waitFor(() => expect(purchases.purchase).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(readCheckoutMethod()).toBe('paddle'));
  });
});
