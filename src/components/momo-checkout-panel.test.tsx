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
// The passes follow the card plans: 1, 4 and 24 weeks, first pass at the welcome price.
const introQuotes: MomoPlanQuote[] = [
  { plan: 'weekly', weeks: 1, amount: 39_000, regular_amount: 79_000, intro: true },
  { plan: 'monthly', weeks: 4, amount: 99_000, regular_amount: 199_000, intro: true },
  { plan: 'six_month', weeks: 24, amount: 799_000, regular_amount: 1_599_000, intro: true },
];
const regularQuotes: MomoPlanQuote[] = introQuotes.map((quote) => ({ ...quote, amount: quote.regular_amount, intro: false }));
// The first catalog the API served: 4, 12 and 52 weeks.
const firstCatalog: MomoPlanQuote[] = [
  { plan: 'monthly', weeks: 4, amount: 99_000, regular_amount: 198_000, intro: true },
  { plan: 'quarterly', weeks: 12, amount: 249_000, regular_amount: 498_000, intro: true },
  { plan: 'yearly', weeks: 52, amount: 599_000, regular_amount: 1_198_000, intro: true },
];

function renderPanel(props: Partial<Parameters<typeof MomoCheckoutPanel>[0]> = {}) {
  return render(<MomoCheckoutPanel leadId="lead-1" locale="en" copy={copy} totalLabel="Total" weeks={24} method="wallet" disabled={false} cardOfferPercent={null} {...props} />);
}

function payButton() {
  return screen.getByRole('button', { name: /MoMo|ATM|Loading prices/ }) as HTMLButtonElement;
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
    const priced = await screen.findByRole('button', { name: /Pay 799\.000đ with MoMo/ });
    expect((priced as HTMLButtonElement).disabled).toBe(false);
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('shows the pass for the plan picked on the paywall as receipt lines', async () => {
    fetchMomoPlans.mockResolvedValue(introQuotes);
    renderPanel();

    await screen.findByRole('button', { name: /Pay 799\.000đ with MoMo/ });
    expect(screen.getByText(copy.planLine(24)).parentElement!.textContent).toContain('1.599.000đ');
    expect(screen.getByText(copy.firstPassDiscount).parentElement!.textContent).toContain('−800.000đ');
    expect(screen.getByText('Total').parentElement!.textContent).toContain(`799.000đ${copy.oneTime}`);
  });

  it('pays by domestic ATM card on MoMo when the buyer picks it', async () => {
    fetchMomoPlans.mockResolvedValue(introQuotes);
    startMomoCheckout.mockResolvedValue({ payUrl, orderId, amount: 99_000 });
    renderPanel({ weeks: 4, method: 'atm' });

    fireEvent.click(await screen.findByRole('button', { name: /Pay 99\.000đ by ATM card/ }));

    await waitFor(() => expect(assign).toHaveBeenCalledWith(payUrl));
    expect(startMomoCheckout).toHaveBeenCalledWith('monthly', 'atm', 'en', 'lead-1');
  });

  it('says MoMo has no pass for a plan length the API does not sell, and still pays the ones it does', async () => {
    fetchMomoPlans.mockResolvedValue(firstCatalog);
    const view = renderPanel({ weeks: 24 });

    expect((await screen.findByRole('status')).textContent).toBe(copy.unavailable(24));
    expect(payButton().disabled).toBe(true);
    expect(startMomoCheckout).not.toHaveBeenCalled();

    view.rerender(<MomoCheckoutPanel leadId="lead-1" locale="en" copy={copy} totalLabel="Total" weeks={4} method="wallet" disabled={false} cardOfferPercent={null} />);
    expect((screen.getByRole('button', { name: /Pay 99\.000đ with MoMo/ }) as HTMLButtonElement).disabled).toBe(false);
  });

  it('shows an error with a retry instead of fallback prices when the quote fails', async () => {
    fetchMomoPlans.mockRejectedValueOnce(new Error('MoMo prices are unavailable.')).mockResolvedValueOnce(introQuotes);
    renderPanel();

    expect((await screen.findByRole('alert')).textContent).toContain(copy.pricesError);
    expect(payButton().disabled).toBe(true);
    expect(screen.queryByText(/đ/)).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: copy.retryPrices }));

    expect(await screen.findByRole('button', { name: /Pay 799\.000đ with MoMo/ })).toBeTruthy();
    expect(screen.queryByRole('alert')).toBeNull();
    expect(fetchMomoPlans).toHaveBeenCalledTimes(2);
  });

  it('opens the MoMo page without recording a checkout method, which only a paid order may set', async () => {
    fetchMomoPlans.mockResolvedValue(introQuotes);
    startMomoCheckout.mockResolvedValue({ payUrl, orderId, amount: 799_000 });
    const onLeave = vi.fn();
    renderPanel({ onLeave });

    fireEvent.click(await screen.findByRole('button', { name: /Pay 799\.000đ with MoMo/ }));

    await waitFor(() => expect(assign).toHaveBeenCalledWith(payUrl));
    expect(onLeave).toHaveBeenCalledTimes(1);
    expect(startMomoCheckout).toHaveBeenCalledWith('six_month', 'wallet', 'en', 'lead-1');
    expect(readCheckoutMethod()).toBeNull();
    expect(useQuizStore.getState().momoOrderId).toBe(orderId);
    expect(trackEvent).toHaveBeenCalledWith('momo_checkout_started', expect.objectContaining({ plan: 'six_month', value: 799_000, currency: 'VND' }));
  });

  it('says a card-only offer does not apply to MoMo', async () => {
    fetchMomoPlans.mockResolvedValue(introQuotes);
    renderPanel({ cardOfferPercent: 75 });

    await screen.findByRole('button', { name: /Pay 799\.000đ with MoMo/ });
    expect(screen.getByText(copy.cardOfferOnly(75))).toBeTruthy();
  });

  it('tells a buyer quoted regular prices not to pay again after a payment, yet lets them buy another pass', async () => {
    // This lead paid already, but this tab loaded its quotes afterwards, so no order amount differs.
    fetchMomoPlans.mockResolvedValue(regularQuotes);
    startMomoCheckout.mockResolvedValue({ payUrl, orderId, amount: 1_599_000 });
    renderPanel();

    const pay = await screen.findByRole('button', { name: /Pay 1\.599\.000đ with MoMo/ });
    expect(screen.getByRole('status').textContent).toBe(copy.justPaid);
    expect(screen.queryByText(copy.firstPassDiscount)).toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();

    fireEvent.click(pay);

    await waitFor(() => expect(assign).toHaveBeenCalledWith(payUrl));
  });

  it('lets the buyer pay again when the browser restores the page after they left for MoMo', async () => {
    fetchMomoPlans.mockResolvedValue(introQuotes);
    startMomoCheckout.mockResolvedValue({ payUrl, orderId, amount: 799_000 });
    const onBusyChange = vi.fn();
    renderPanel({ onBusyChange });

    fireEvent.click(await screen.findByRole('button', { name: /Pay 799\.000đ with MoMo/ }));
    await waitFor(() => expect(assign).toHaveBeenCalledWith(payUrl));
    expect(payButton().textContent).toBe(copy.opening);
    expect(payButton().disabled).toBe(true);

    // The buyer swipes back from MoMo and Safari restores the paywall from its back/forward cache.
    act(() => { window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })); });

    expect(payButton().textContent).toBe(copy.pay('799.000đ'));
    expect(payButton().disabled).toBe(false);
    expect(onBusyChange).toHaveBeenLastCalledWith(false);
  });

  it('tells the checkout it is busy while the order is created, so the method and plan stay fixed', async () => {
    fetchMomoPlans.mockResolvedValue(introQuotes);
    const settle = holdCheckout();
    const onBusyChange = vi.fn();
    renderPanel({ onBusyChange });

    fireEvent.click(await screen.findByRole('button', { name: /Pay 799\.000đ with MoMo/ }));

    await waitFor(() => expect(onBusyChange).toHaveBeenLastCalledWith(true));
    expect(payButton().disabled).toBe(true);

    await settle({ payUrl, orderId, amount: 799_000 });
    expect(assign).toHaveBeenCalledWith(payUrl);
    expect(startMomoCheckout).toHaveBeenCalledWith('six_month', 'wallet', 'en', 'lead-1');
  });

  it('stays on the page when the panel closes before the order is created', async () => {
    fetchMomoPlans.mockResolvedValue(introQuotes);
    const settle = holdCheckout();
    const view = renderPanel();

    fireEvent.click(await screen.findByRole('button', { name: /Pay 799\.000đ with MoMo/ }));
    // The buyer closes the checkout sheet, which removes the MoMo panel.
    view.unmount();
    await settle({ payUrl, orderId, amount: 799_000 });

    expect(assign).not.toHaveBeenCalled();
    expect(useQuizStore.getState().momoOrderId).toBeNull();
  });

  it('reloads every price instead of opening MoMo when the order charges another amount', async () => {
    fetchMomoPlans.mockResolvedValueOnce(introQuotes).mockResolvedValueOnce(regularQuotes);
    startMomoCheckout.mockResolvedValueOnce({ payUrl, orderId, amount: 1_599_000 });
    renderPanel();

    fireEvent.click(await screen.findByRole('button', { name: /Pay 799\.000đ with MoMo/ }));

    await screen.findByRole('button', { name: /Pay 1\.599\.000đ with MoMo/ });
    expect(screen.getByRole('status').textContent).toBe(copy.pricesUpdated);
    expect(fetchMomoPlans).toHaveBeenCalledTimes(2);
    expect(assign).not.toHaveBeenCalled();
    expect(useQuizStore.getState().momoOrderId).toBeNull();
    expect(trackEvent).not.toHaveBeenCalledWith('momo_checkout_started', expect.anything());
    expect(screen.queryByText(/799\.000đ/)).toBeNull();

    const nextOrderId = 'c'.repeat(32);
    startMomoCheckout.mockResolvedValueOnce({ payUrl, orderId: nextOrderId, amount: 1_599_000 });
    fireEvent.click(screen.getByRole('button', { name: /Pay 1\.599\.000đ with MoMo/ }));

    await waitFor(() => expect(assign).toHaveBeenCalledWith(payUrl));
    expect(useQuizStore.getState().momoOrderId).toBe(nextOrderId);
    expect(trackEvent).toHaveBeenCalledWith('momo_checkout_started', expect.objectContaining({ plan: 'six_month', value: 1_599_000, intro: false }));
    expect(screen.getByRole('status').textContent).toBe(copy.justPaid);
  });

  it('states no renewal price below the charge when the regular price rose', async () => {
    const raised = regularQuotes.map((quote) => (quote.plan === 'six_month' ? { ...quote, amount: 1_799_000, regular_amount: 1_799_000 } : quote));
    fetchMomoPlans.mockResolvedValueOnce(regularQuotes).mockResolvedValueOnce(raised);
    startMomoCheckout.mockResolvedValue({ payUrl, orderId, amount: 1_799_000 });
    renderPanel();

    fireEvent.click(await screen.findByRole('button', { name: /Pay 1\.599\.000đ with MoMo/ }));

    await screen.findByRole('button', { name: /Pay 1\.799\.000đ with MoMo/ });
    expect(screen.getByText(copy.summary('1.799.000đ', 24), { exact: false }).textContent).not.toContain('1.599.000đ');
    expect(assign).not.toHaveBeenCalled();
  });

  it('keeps Pay unpriced with a retry when the reloaded prices fail', async () => {
    fetchMomoPlans.mockResolvedValueOnce(introQuotes).mockRejectedValueOnce(new Error('MoMo prices are unavailable.'));
    startMomoCheckout.mockResolvedValue({ payUrl, orderId, amount: 1_599_000 });
    renderPanel();

    fireEvent.click(await screen.findByRole('button', { name: /Pay 799\.000đ with MoMo/ }));

    expect((await screen.findByRole('alert')).textContent).toContain(copy.pricesError);
    expect(payButton().disabled).toBe(true);
    expect(screen.queryByText(/\d\.000đ/)).toBeNull();
    expect(assign).not.toHaveBeenCalled();
  });

  it('shows its own error copy instead of the upstream message when checkout fails', async () => {
    fetchMomoPlans.mockResolvedValue(introQuotes);
    startMomoCheckout.mockRejectedValue(new Error('MoMo checkout is unavailable.'));
    renderPanel();

    fireEvent.click(await screen.findByRole('button', { name: /Pay 799\.000đ with MoMo/ }));

    expect((await screen.findByRole('alert')).textContent).toBe(copy.checkoutError);
    expect(payButton().disabled).toBe(false);
    expect(assign).not.toHaveBeenCalled();
  });
});
