/** @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { copyFor } from '@/lib/copy';
import type { MomoPlanQuote } from '@/lib/payments/momo-checkout';
import { useQuizStore } from '@/lib/quiz/store';
import { readCheckoutMethod } from '@/lib/revenuecat/checkout-email';
import { MomoCheckoutPanel } from './momo-checkout-panel';

const fetchMomoPlans = vi.hoisted(() => vi.fn());
const startMomoCheckout = vi.hoisted(() => vi.fn());
const trackEvent = vi.hoisted(() => vi.fn());

vi.mock('@/lib/payments/momo-checkout', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/payments/momo-checkout')>()),
  fetchMomoPlans,
  startMomoCheckout,
}));
vi.mock('@/lib/analytics/track', () => ({ trackEvent }));

const copy = copyFor('en').momoCheckout;
const orderId = '7fca4122bc86438a8a2ab4721f8a914d';
const payUrl = 'https://test-payment.momo.vn/v2/gateway/pay?t=1';
const introQuotes: MomoPlanQuote[] = [
  { plan: 'monthly', weeks: 4, amount: 99_000, regular_amount: 198_000, intro: true },
  { plan: 'quarterly', weeks: 12, amount: 249_000, regular_amount: 498_000, intro: true },
  { plan: 'yearly', weeks: 52, amount: 599_000, regular_amount: 1_198_000, intro: true },
];
const regularQuotes: MomoPlanQuote[] = [
  { plan: 'monthly', weeks: 4, amount: 198_000, regular_amount: 198_000, intro: false },
  { plan: 'quarterly', weeks: 12, amount: 498_000, regular_amount: 498_000, intro: false },
  { plan: 'yearly', weeks: 52, amount: 1_198_000, regular_amount: 1_198_000, intro: false },
];

function renderPanel() {
  render(<MomoCheckoutPanel leadId="lead-1" locale="en" copy={copy} recommendedLabel="Recommended" selectPlanAria="Choose a plan" disabled={false} />);
}

function payButton() {
  return screen.getByRole('button', { name: /MoMo|Loading prices/ }) as HTMLButtonElement;
}

describe('MomoCheckoutPanel', () => {
  const assign = vi.fn();

  beforeEach(() => {
    sessionStorage.clear();
    useQuizStore.getState().reset();
    fetchMomoPlans.mockReset();
    startMomoCheckout.mockReset();
    trackEvent.mockClear();
    assign.mockClear();
    vi.stubGlobal('location', { ...window.location, assign });
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('keeps Pay disabled and unpriced until the backend quote loads', async () => {
    let resolve: (plans: MomoPlanQuote[]) => void = () => {};
    fetchMomoPlans.mockReturnValue(new Promise<MomoPlanQuote[]>((done) => { resolve = done; }));
    renderPanel();

    expect(payButton().disabled).toBe(true);
    expect(payButton().textContent).toContain(copy.loadingPrices);
    expect(screen.queryByText(/đ/)).toBeNull();

    resolve(regularQuotes);
    const priced = await screen.findByRole('button', { name: /Pay 498\.000đ with MoMo/ });
    expect((priced as HTMLButtonElement).disabled).toBe(false);
  });

  it('shows an error with a retry instead of fallback prices when the quote fails', async () => {
    fetchMomoPlans.mockRejectedValueOnce(new Error('MoMo prices are unavailable.')).mockResolvedValueOnce(regularQuotes);
    renderPanel();

    expect((await screen.findByRole('alert')).textContent).toContain(copy.pricesError);
    expect(payButton().disabled).toBe(true);
    expect(screen.queryByText(/đ/)).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: copy.retryPrices }));

    expect(await screen.findByRole('button', { name: /Pay 498\.000đ with MoMo/ })).toBeTruthy();
    expect(screen.queryByRole('alert')).toBeNull();
    expect(fetchMomoPlans).toHaveBeenCalledTimes(2);
  });

  it('opens the MoMo page without recording a checkout method, which only a paid order may set', async () => {
    fetchMomoPlans.mockResolvedValue(introQuotes);
    startMomoCheckout.mockResolvedValue({ payUrl, orderId, amount: 249_000 });
    renderPanel();

    fireEvent.click(await screen.findByRole('button', { name: /Pay 249\.000đ with MoMo/ }));

    await waitFor(() => expect(assign).toHaveBeenCalledWith(payUrl));
    expect(startMomoCheckout).toHaveBeenCalledWith('quarterly', 'wallet', 'en', 'lead-1');
    expect(readCheckoutMethod()).toBeNull();
    expect(useQuizStore.getState().momoOrderId).toBe(orderId);
    expect(trackEvent).toHaveBeenCalledWith('momo_checkout_started', expect.objectContaining({ amount: 249_000, currency: 'VND' }));
  });

  it('shows the new price instead of opening MoMo when the order charges more than the quote on screen', async () => {
    fetchMomoPlans.mockResolvedValueOnce(introQuotes).mockResolvedValueOnce(regularQuotes);
    startMomoCheckout.mockResolvedValue({ payUrl, orderId, amount: 498_000 });
    renderPanel();

    fireEvent.click(await screen.findByRole('button', { name: /Pay 249\.000đ with MoMo/ }));

    expect((await screen.findByRole('alert')).textContent).toBe(copy.priceChanged('498.000đ'));
    const repriced = await screen.findByRole('button', { name: /Pay 498\.000đ with MoMo/ });
    expect(fetchMomoPlans).toHaveBeenCalledTimes(2);
    expect(assign).not.toHaveBeenCalled();
    expect(useQuizStore.getState().momoOrderId).toBeNull();
    expect(trackEvent).not.toHaveBeenCalledWith('momo_checkout_started', expect.anything());

    fireEvent.click(repriced);

    await waitFor(() => expect(assign).toHaveBeenCalledWith(payUrl));
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
