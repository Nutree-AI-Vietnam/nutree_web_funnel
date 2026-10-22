/** @vitest-environment jsdom */

import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { copyFor } from '@/lib/copy';
import { useQuizStore } from '@/lib/quiz/store';
import { readCheckoutMethod, rememberCheckoutMethod } from '@/lib/revenuecat/checkout-email';
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
const copy = copyFor('en').momoReturn;

function statusResponse(body: unknown, status = 200) {
  vi.stubGlobal('fetch', vi.fn(async () => Response.json(body, { status })));
}

function purchaseEvents() {
  return trackEvent.mock.calls.filter(([name]) => name === 'momo_checkout_completed');
}

describe('MoMo return page', () => {
  beforeEach(async () => {
    sessionStorage.clear();
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

  it('marks a paid order as MoMo, reports the purchase once and opens MoMo post-checkout', async () => {
    statusResponse({ order_id: orderId, status: 'paid', plan: 'quarterly', amount: 249000 });
    render(<MomoReturnPage />);

    expect(await screen.findByRole('heading', { name: copy.paidHeadline })).toBeTruthy();
    expect(readCheckoutMethod()).toBe('momo');
    expect(purchaseEvents()).toEqual([[
      'momo_checkout_completed',
      { order_id: orderId, plan: 'quarterly', value: 249000, currency: 'VND' },
    ]]);
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/postcheckout?method=momo'), { timeout: 3000 });

    cleanup();
    render(<MomoReturnPage />);
    expect(await screen.findByRole('heading', { name: copy.paidHeadline })).toBeTruthy();
    expect(purchaseEvents()).toHaveLength(1);
  });

  it('clears the checkout method when the order failed', async () => {
    rememberCheckoutMethod('momo');
    statusResponse({ order_id: orderId, status: 'failed', plan: 'quarterly', amount: 249000 });
    render(<MomoReturnPage />);

    expect(await screen.findByRole('heading', { name: copy.failedHeadline })).toBeTruthy();
    expect(readCheckoutMethod()).toBeNull();
    expect(screen.getByRole('link', { name: copy.tryAgain })).toBeTruthy();
    expect(purchaseEvents()).toHaveLength(0);
  });

  it('does not push a buyer who may have paid to buy again when this browser has no session', async () => {
    statusResponse({ detail: 'Draft session unavailable.' }, 401);
    render(<MomoReturnPage />);

    expect(await screen.findByRole('heading', { name: copy.unconfirmedHeadline })).toBeTruthy();
    expect(screen.getByText(orderId)).toBeTruthy();
    expect(screen.getByRole('link', { name: 'nutreeaidev@gmail.com' }).getAttribute('href')).toContain(orderId);
    expect(screen.queryByRole('link', { name: copy.tryAgain })).toBeNull();
    expect(screen.getByRole('link', { name: copy.notPaid }).getAttribute('href')).toBe('/paywall');
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
