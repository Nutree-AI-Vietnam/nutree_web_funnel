/** @vitest-environment jsdom */

import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PostcheckoutPageClient } from '@/app/(default)/postcheckout/postcheckout-page-client';
import { copyFor } from '@/lib/copy';
import { useQuizStore } from '@/lib/quiz/store';
import { readCheckoutMethod } from '@/lib/revenuecat/checkout-email';
import MomoReturnPage from './page';

const replace = vi.hoisted(() => vi.fn());
const search = vi.hoisted(() => ({ value: '' }));
const trackEvent = vi.hoisted(() => vi.fn());

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace, push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(search.value),
}));
vi.mock('@/lib/analytics/track', () => ({ trackEvent }));

const orderId = '7fca4122bc86438a8a2ab4721f8a914d';
const failedOrderId = 'b'.repeat(32);
const copy = copyFor('en').momoReturn;
const momoHeadline = copyFor('en').momoCheckout.paidHeadline;

/** Browser-wide storage shared by every tab; Node's own localStorage global hides jsdom's. */
function memoryStorage(): Storage {
  const values = new Map<string, string>();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => void values.set(key, value),
    removeItem: (key) => void values.delete(key),
    clear: () => values.clear(),
    key: (index) => [...values.keys()][index] ?? null,
    get length() {
      return values.size;
    },
  };
}

function statusResponse(body: unknown, status = 200) {
  vi.stubGlobal('fetch', vi.fn(async () => Response.json(body, { status })));
}

function purchaseEvents() {
  return trackEvent.mock.calls.filter(([name]) => name === 'momo_checkout_completed');
}

describe('MoMo return page', () => {
  beforeEach(async () => {
    sessionStorage.clear();
    vi.stubGlobal('localStorage', memoryStorage());
    window.history.replaceState(null, '', '/momo/return');
    await useQuizStore.persist.rehydrate();
    useQuizStore.getState().reset();
    useQuizStore.getState().setLocale('en');
    search.value = `orderId=${orderId}&resultCode=0`;
    replace.mockClear();
    trackEvent.mockClear();
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    useQuizStore.getState().setLocale('vi');
  });

  it('marks a paid order as MoMo, reports the purchase once per browser and opens MoMo post-checkout', async () => {
    statusResponse({ order_id: orderId, status: 'paid', plan: 'rc_6monthly50', amount: 599000 });
    render(<MomoReturnPage />);

    expect(await screen.findByRole('heading', { name: copy.paidHeadline })).toBeTruthy();
    expect(readCheckoutMethod()).toBe('momo');
    expect(purchaseEvents()).toEqual([[
      'momo_checkout_completed',
      { order_id: orderId, plan: 'rc_6monthly50', value: 599000, currency: 'VND' },
    ]]);
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/postcheckout?method=momo'), { timeout: 3000 });

    // Another tab of the same browser (MoMo often opens the return link in a new one) starts with empty session storage.
    cleanup();
    sessionStorage.clear();
    render(<MomoReturnPage />);
    expect(await screen.findByRole('heading', { name: copy.paidHeadline })).toBeTruthy();
    expect(purchaseEvents()).toHaveLength(1);
  });

  it('keeps the MoMo hand-off of a paid order when an earlier failed order is revisited', async () => {
    useQuizStore.getState().setLead({ lead_id: 'lead-1', masked_email: 'b***@example.com', status: 'payment_pending' });
    vi.stubGlobal('fetch', vi.fn(async (url: string) => Response.json(url.includes(orderId)
      ? { order_id: orderId, status: 'paid', plan: 'rc_6monthly50', amount: 599000 }
      : { order_id: failedOrderId, status: 'failed', plan: 'rc_6monthly50', amount: 599000 })));
    render(<MomoReturnPage />);
    expect(await screen.findByRole('heading', { name: copy.paidHeadline })).toBeTruthy();
    cleanup();

    // Back through the history reaches the cancelled attempt's return page.
    search.value = `orderId=${failedOrderId}&resultCode=1006`;
    render(<MomoReturnPage />);
    expect(await screen.findByRole('heading', { name: copy.failedHeadline })).toBeTruthy();
    expect(screen.getByRole('link', { name: copy.tryAgain })).toBeTruthy();
    expect(readCheckoutMethod()).toBe('momo');
    cleanup();

    // The paywall sends a paid lead to /postcheckout without ?method=momo.
    window.history.replaceState(null, '', '/postcheckout');
    render(<PostcheckoutPageClient />);
    expect(await screen.findByRole('heading', { name: momoHeadline })).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'Check your email' })).toBeNull();
  });

  it('leaves the checkout method alone and reports no purchase when the order failed', async () => {
    statusResponse({ order_id: orderId, status: 'failed', plan: 'rc_6monthly50', amount: 599000 });
    render(<MomoReturnPage />);

    expect(await screen.findByRole('heading', { name: copy.failedHeadline })).toBeTruthy();
    expect(readCheckoutMethod()).toBeNull();
    expect(purchaseEvents()).toHaveLength(0);
  });

  it.each([
    [401, 'Draft session unavailable.'],
    [404, 'Not found.'],
  ])('does not push a buyer who may have paid to buy again when this browser cannot read the order (%i)', async (status, detail) => {
    statusResponse({ detail }, status);
    render(<MomoReturnPage />);

    expect(await screen.findByRole('heading', { name: copy.unconfirmedHeadline })).toBeTruthy();
    expect(screen.getByText(orderId)).toBeTruthy();
    expect(screen.getByRole('link', { name: 'nutreeaidev@gmail.com' }).getAttribute('href')).toContain(orderId);
    expect(screen.queryByRole('link', { name: copy.tryAgain })).toBeNull();
    expect(screen.getByRole('link', { name: copy.notPaid }).getAttribute('href')).toBe('/paywall');
    // An order this browser cannot read is not confirmed paid, so no checkout method is recorded.
    expect(readCheckoutMethod()).toBeNull();
    expect(purchaseEvents()).toHaveLength(0);
  });

  it('offers to choose a plan again when there is no order to look up', async () => {
    search.value = '';
    vi.stubGlobal('fetch', vi.fn());
    render(<MomoReturnPage />);

    expect(await screen.findByRole('heading', { name: copy.sessionHeadline })).toBeTruthy();
    expect(screen.getByRole('link', { name: copy.tryAgain })).toBeTruthy();
    expect(fetch).not.toHaveBeenCalled();
  });
});
