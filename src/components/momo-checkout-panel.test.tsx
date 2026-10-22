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
const getLeadStatus = vi.hoisted(() => vi.fn());

vi.mock('@/lib/payments/momo-checkout', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/payments/momo-checkout')>()),
  fetchMomoPlans,
  startMomoCheckout,
}));
vi.mock('@/lib/analytics/track', () => ({ trackEvent }));
vi.mock('@/lib/api/client', () => ({ getLeadStatus }));

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

/** The Pay button's name also carries the MoMo logo's alt text. */
function buyAnother(amount: string) {
  return { name: (name: string) => name.endsWith(copy.payAnother(amount)) };
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
    getLeadStatus.mockReset();
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
    expect(trackEvent).toHaveBeenCalledWith('momo_checkout_started', expect.objectContaining({ amount: 249_000, currency: 'VND' }));
    expect(getLeadStatus).not.toHaveBeenCalled();
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

  it('hands a lead that has already paid to the MoMo sign-in instead of charging it again', async () => {
    useQuizStore.getState().setLead({ lead_id: 'lead-1', masked_email: 'b***@example.com', status: 'payment_pending' });
    fetchMomoPlans.mockResolvedValueOnce(introQuotes).mockResolvedValueOnce(regularQuotes);
    startMomoCheckout.mockResolvedValue({ payUrl, orderId, amount: 498_000 });
    getLeadStatus.mockResolvedValue({ lead_id: 'lead-1', masked_email: 'b***@example.com', status: 'payment_verified' });
    renderPanel();

    fireEvent.click(await screen.findByRole('button', { name: /Pay 249\.000đ with MoMo/ }));

    await waitFor(() => expect(useQuizStore.getState().lead?.status).toBe('payment_verified'));
    expect(getLeadStatus).toHaveBeenCalledWith('lead-1');
    expect(readCheckoutMethod()).toBe('momo');
    expect(useQuizStore.getState().purchased).toBe(true);
    expect(assign).not.toHaveBeenCalled();
    expect(useQuizStore.getState().momoOrderId).toBeNull();
    expect(trackEvent).not.toHaveBeenCalledWith('momo_checkout_started', expect.anything());
  });

  it.each([
    ['the lead is still unpaid', () => getLeadStatus.mockResolvedValue({ lead_id: 'lead-1', masked_email: 'b***@example.com', status: 'payment_pending' })],
    ['the lead status cannot be read', () => getLeadStatus.mockRejectedValue(new Error('Could not load checkout status: 503'))],
  ])('tells a buyer whose email already bought a pass and makes another one an explicit purchase when %s', async (_case, stubLead) => {
    stubLead();
    fetchMomoPlans.mockResolvedValueOnce(introQuotes).mockResolvedValueOnce(regularQuotes);
    startMomoCheckout.mockResolvedValue({ payUrl, orderId, amount: 498_000 });
    renderPanel();

    fireEvent.click(await screen.findByRole('button', { name: /Pay 249\.000đ with MoMo/ }));

    const another = await screen.findByRole('button', buyAnother('498.000đ'));
    expect(screen.getByRole('alert').textContent).toBe(copy.paidBefore);
    expect(assign).not.toHaveBeenCalled();
    expect(readCheckoutMethod()).toBeNull();
    expect(useQuizStore.getState().momoOrderId).toBeNull();

    // Switching plans keeps both the notice and the explicit label.
    fireEvent.click(screen.getAllByRole('radio').find((choice) => choice.textContent?.includes('1.198.000đ'))!);
    expect(screen.getByRole('alert').textContent).toBe(copy.paidBefore);
    expect(screen.getByRole('button', buyAnother('1.198.000đ'))).toBeTruthy();
    fireEvent.click(screen.getAllByRole('radio').find((choice) => choice.textContent?.includes('498.000đ'))!);

    fireEvent.click(another);
    await waitFor(() => expect(assign).toHaveBeenCalledWith(payUrl));
  });

  it('shows the new price instead of opening MoMo when the order charges another amount at the same intro status', async () => {
    const repriced = introQuotes.map((quote) => (quote.plan === 'quarterly' ? { ...quote, amount: 279_000 } : quote));
    fetchMomoPlans.mockResolvedValueOnce(introQuotes).mockResolvedValueOnce(repriced);
    startMomoCheckout.mockResolvedValue({ payUrl, orderId, amount: 279_000 });
    renderPanel();

    fireEvent.click(await screen.findByRole('button', { name: /Pay 249\.000đ with MoMo/ }));

    const pay = await screen.findByRole('button', { name: /Pay 279\.000đ with MoMo/ });
    expect(screen.getByRole('alert').textContent).toBe(copy.priceChanged('279.000đ'));
    expect(fetchMomoPlans).toHaveBeenCalledTimes(2);
    expect(getLeadStatus).not.toHaveBeenCalled();
    expect(assign).not.toHaveBeenCalled();
    expect(useQuizStore.getState().momoOrderId).toBeNull();
    expect(trackEvent).not.toHaveBeenCalledWith('momo_checkout_started', expect.anything());

    fireEvent.click(pay);

    await waitFor(() => expect(assign).toHaveBeenCalledWith(payUrl));
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
