/** @vitest-environment jsdom */

import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { copyFor } from '@/lib/copy';
import type { MomoCheckoutStart, MomoPlanQuote } from '@/lib/payments/momo-checkout';
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
  return render(<MomoCheckoutPanel leadId="lead-1" locale="en" copy={copy} recommendedLabel="Recommended" selectPlanAria="Choose a plan" disabled={false} />);
}

function payButton() {
  return screen.getByRole('button', { name: /MoMo|Loading prices/ }) as HTMLButtonElement;
}

/** Holds the order request open, as while MoMo creates the payment. */
function holdCheckout() {
  let resolve: (started: MomoCheckoutStart) => void = () => {};
  startMomoCheckout.mockReturnValue(new Promise<MomoCheckoutStart>((done) => { resolve = done; }));
  return (started: MomoCheckoutStart) => act(async () => { resolve(started); });
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

    resolve(introQuotes);
    const priced = await screen.findByRole('button', { name: /Pay 249\.000đ with MoMo/ });
    expect((priced as HTMLButtonElement).disabled).toBe(false);
  });

  it('shows an error with a retry instead of fallback prices when the quote fails', async () => {
    fetchMomoPlans.mockRejectedValueOnce(new Error('MoMo prices are unavailable.')).mockResolvedValueOnce(introQuotes);
    renderPanel();

    expect((await screen.findByRole('alert')).textContent).toContain(copy.pricesError);
    expect(payButton().disabled).toBe(true);
    expect(screen.queryByText(/đ/)).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: copy.retryPrices }));

    expect(await screen.findByRole('button', { name: /Pay 249\.000đ with MoMo/ })).toBeTruthy();
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
    expect(trackEvent).toHaveBeenCalledWith('momo_checkout_started', expect.objectContaining({ plan: 'quarterly', value: 249_000, currency: 'VND' }));
  });

  it('prices a buyer quoted regular prices like any other, without mentioning earlier purchases', async () => {
    fetchMomoPlans.mockResolvedValue(regularQuotes);
    startMomoCheckout.mockResolvedValue({ payUrl, orderId, amount: 498_000 });
    renderPanel();

    fireEvent.click(await screen.findByRole('button', { name: /Pay 498\.000đ with MoMo/ }));

    await waitFor(() => expect(assign).toHaveBeenCalledWith(payUrl));
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('keeps the plan and payment method fixed while the order is created', async () => {
    fetchMomoPlans.mockResolvedValue(introQuotes);
    const settle = holdCheckout();
    renderPanel();

    fireEvent.click(await screen.findByRole('button', { name: /Pay 249\.000đ with MoMo/ }));

    const choices = screen.getAllByRole('radio') as HTMLButtonElement[];
    expect(choices).toHaveLength(5);
    expect(choices.every((choice) => choice.disabled)).toBe(true);
    const yearly = choices.find((choice) => choice.textContent?.includes('599.000đ'));
    fireEvent.click(yearly!);
    expect(yearly!.getAttribute('aria-checked')).toBe('false');

    await settle({ payUrl, orderId, amount: 249_000 });
    expect(assign).toHaveBeenCalledWith(payUrl);
    expect(startMomoCheckout).toHaveBeenCalledWith('quarterly', 'wallet', 'en', 'lead-1');
  });

  it('stays on the page when the panel closes before the order is created', async () => {
    fetchMomoPlans.mockResolvedValue(introQuotes);
    const settle = holdCheckout();
    const view = renderPanel();

    fireEvent.click(await screen.findByRole('button', { name: /Pay 249\.000đ with MoMo/ }));
    // The buyer switches the paywall to card, which removes the MoMo panel.
    view.unmount();
    await settle({ payUrl, orderId, amount: 249_000 });

    expect(assign).not.toHaveBeenCalled();
    expect(useQuizStore.getState().momoOrderId).toBeNull();
  });

  it('reloads every price instead of opening MoMo when the order charges another amount', async () => {
    fetchMomoPlans.mockResolvedValueOnce(introQuotes).mockResolvedValueOnce(regularQuotes);
    startMomoCheckout.mockResolvedValueOnce({ payUrl, orderId, amount: 498_000 });
    renderPanel();

    fireEvent.click(await screen.findByRole('button', { name: /Pay 249\.000đ with MoMo/ }));

    await screen.findByRole('button', { name: /Pay 498\.000đ with MoMo/ });
    expect(screen.getByRole('status').textContent).toBe(copy.pricesUpdated);
    expect(fetchMomoPlans).toHaveBeenCalledTimes(2);
    expect(assign).not.toHaveBeenCalled();
    expect(useQuizStore.getState().momoOrderId).toBeNull();
    expect(trackEvent).not.toHaveBeenCalledWith('momo_checkout_started', expect.anything());

    // The backend priced every plan for this buyer at once, so no card keeps an intro price.
    const cards = screen.getAllByRole('radio').slice(0, 3).map((choice) => choice.textContent);
    expect(cards.join(' ')).not.toMatch(/\b(99|249|599)\.000đ/);
    fireEvent.click(screen.getAllByRole('radio').find((choice) => choice.textContent?.includes('1.198.000đ'))!);
    expect(screen.getByRole('status').textContent).toBe(copy.pricesUpdated);

    const nextOrderId = 'c'.repeat(32);
    startMomoCheckout.mockResolvedValueOnce({ payUrl, orderId: nextOrderId, amount: 1_198_000 });
    fireEvent.click(screen.getByRole('button', { name: /Pay 1\.198\.000đ with MoMo/ }));

    await waitFor(() => expect(assign).toHaveBeenCalledWith(payUrl));
    expect(startMomoCheckout).toHaveBeenLastCalledWith('yearly', 'wallet', 'en', 'lead-1');
    expect(useQuizStore.getState().momoOrderId).toBe(nextOrderId);
    expect(trackEvent).toHaveBeenCalledWith('momo_checkout_started', expect.objectContaining({ plan: 'yearly', value: 1_198_000, intro: false }));
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('states no renewal price below the charge when the regular price rose', async () => {
    const raised = regularQuotes.map((quote) => (quote.plan === 'quarterly' ? { ...quote, amount: 548_000, regular_amount: 548_000 } : quote));
    fetchMomoPlans.mockResolvedValueOnce(regularQuotes).mockResolvedValueOnce(raised);
    startMomoCheckout.mockResolvedValue({ payUrl, orderId, amount: 548_000 });
    renderPanel();

    fireEvent.click(await screen.findByRole('button', { name: /Pay 498\.000đ with MoMo/ }));

    await screen.findByRole('button', { name: /Pay 548\.000đ with MoMo/ });
    expect(screen.getByText(copy.summary('548.000đ', 12), { exact: false }).textContent).not.toContain('498.000đ');
    expect(assign).not.toHaveBeenCalled();
  });

  it('keeps Pay unpriced with a retry when the reloaded prices fail', async () => {
    fetchMomoPlans.mockResolvedValueOnce(introQuotes).mockRejectedValueOnce(new Error('MoMo prices are unavailable.'));
    startMomoCheckout.mockResolvedValue({ payUrl, orderId, amount: 498_000 });
    renderPanel();

    fireEvent.click(await screen.findByRole('button', { name: /Pay 249\.000đ with MoMo/ }));

    expect((await screen.findByRole('alert')).textContent).toContain(copy.pricesError);
    expect(payButton().disabled).toBe(true);
    expect(screen.queryByText(/\d\.000đ/)).toBeNull();
    expect(assign).not.toHaveBeenCalled();
  });

  it('shows its own error copy instead of the upstream message when checkout fails', async () => {
    fetchMomoPlans.mockResolvedValue(introQuotes);
    startMomoCheckout.mockRejectedValue(new Error('MoMo checkout is unavailable.'));
    renderPanel();

    fireEvent.click(await screen.findByRole('button', { name: /Pay 249\.000đ with MoMo/ }));

    expect((await screen.findByRole('alert')).textContent).toBe(copy.checkoutError);
    expect(payButton().disabled).toBe(false);
    expect(assign).not.toHaveBeenCalled();
  });
});
