/** @vitest-environment jsdom */

import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { copyFor } from '@/lib/copy';
import type { MomoCheckoutStart } from '@/lib/payments/momo-checkout';
import { useQuizStore } from '@/lib/quiz/store';
import { readCheckoutMethod } from '@/lib/revenuecat/checkout-email';
import { MomoCheckoutPanel, type MomoCardPlan } from './momo-checkout-panel';

const startMomoCheckout = vi.hoisted(() => vi.fn());
const trackEvent = vi.hoisted(() => vi.fn());

vi.mock('@/lib/payments/momo-checkout', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/payments/momo-checkout')>()),
  startMomoCheckout,
}));
vi.mock('@/lib/analytics/track', () => ({ trackEvent }));

const copy = copyFor('en').momoCheckout;
const orderId = '7fca4122bc86438a8a2ab4721f8a914d';
const payUrl = 'https://test-payment.momo.vn/v2/gateway/pay?t=1';
// The 24-week card plan under the welcome offer, with the numbers the card checkout shows.
const welcomePlan: MomoCardPlan = {
  packageId: 'rc_6monthly50',
  label: '24-week plan',
  weeks: 24,
  amount: 599_000,
  fullAmount: 1_099_000,
  discountLabel: '50% welcome discount',
};

function renderPanel(props: Partial<Parameters<typeof MomoCheckoutPanel>[0]> = {}) {
  return render(<MomoCheckoutPanel leadId="lead-1" locale="en" copy={copy} totalLabel="Total" plan={welcomePlan} method="wallet" disabled={false} {...props} />);
}

function payButton() {
  return screen.getByRole('button', { name: /MoMo|ATM/ }) as HTMLButtonElement;
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
    startMomoCheckout.mockReset();
    trackEvent.mockClear();
    assign.mockClear();
    vi.stubGlobal('location', { ...window.location, assign });
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('shows the card’s numbers for the picked plan, paid once', () => {
    renderPanel();

    expect(screen.getByText('24-week plan').parentElement!.textContent).toContain('1.099.000đ');
    expect(screen.getByText('50% welcome discount').parentElement!.textContent).toContain('−500.000đ');
    expect(screen.getByText('Total').parentElement!.textContent).toContain(`599.000đ${copy.oneTime}`);
    expect(payButton().textContent).toBe(copy.pay('599.000đ'));
    expect(screen.getByText(copy.summary('599.000đ', 24))).toBeTruthy();
  });

  it('shows one price line when no offer applies', () => {
    renderPanel({ plan: { ...welcomePlan, packageId: '$rc_six_month', amount: 1_099_000, discountLabel: null } });

    expect(screen.queryByText('50% welcome discount')).toBeNull();
    expect(payButton().textContent).toBe(copy.pay('1.099.000đ'));
  });

  it('opens the MoMo page for the plan’s package without recording a checkout method, which only a paid order may set', async () => {
    startMomoCheckout.mockResolvedValue({ payUrl, orderId, amount: 599_000 });
    const onLeave = vi.fn();
    renderPanel({ onLeave });

    fireEvent.click(payButton());

    await waitFor(() => expect(assign).toHaveBeenCalledWith(payUrl));
    expect(startMomoCheckout).toHaveBeenCalledWith('rc_6monthly50', 'wallet', 'en', 'lead-1');
    expect(onLeave).toHaveBeenCalledTimes(1);
    expect(readCheckoutMethod()).toBeNull();
    expect(useQuizStore.getState().momoOrderId).toBe(orderId);
    expect(trackEvent).toHaveBeenCalledWith('momo_checkout_started', { plan: 'rc_6monthly50', method: 'wallet', value: 599_000, currency: 'VND' });
  });

  it('pays by domestic ATM card on MoMo when the buyer picks it', async () => {
    startMomoCheckout.mockResolvedValue({ payUrl, orderId, amount: 599_000 });
    renderPanel({ method: 'atm' });

    expect(payButton().textContent).toBe(copy.payAtm('599.000đ'));
    fireEvent.click(payButton());

    await waitFor(() => expect(assign).toHaveBeenCalledWith(payUrl));
    expect(startMomoCheckout).toHaveBeenCalledWith('rc_6monthly50', 'atm', 'en', 'lead-1');
  });

  it('stays here and asks for a reload when the order charges another amount than the page shows', async () => {
    startMomoCheckout.mockResolvedValue({ payUrl, orderId, amount: 699_000 });
    renderPanel();

    fireEvent.click(payButton());

    expect((await screen.findByRole('status')).textContent).toBe(copy.pricesUpdated);
    expect(payButton().disabled).toBe(true);
    expect(assign).not.toHaveBeenCalled();
    expect(useQuizStore.getState().momoOrderId).toBeNull();
    expect(trackEvent).not.toHaveBeenCalled();
  });

  it('lets the buyer pay again when the browser restores the page after they left for MoMo', async () => {
    startMomoCheckout.mockResolvedValue({ payUrl, orderId, amount: 599_000 });
    const onBusyChange = vi.fn();
    renderPanel({ onBusyChange });

    fireEvent.click(payButton());
    await waitFor(() => expect(assign).toHaveBeenCalledWith(payUrl));
    expect(payButton().textContent).toBe(copy.opening);
    expect(payButton().disabled).toBe(true);

    // The buyer swipes back from MoMo and Safari restores the paywall from its back/forward cache.
    act(() => { window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })); });

    expect(payButton().textContent).toBe(copy.pay('599.000đ'));
    expect(payButton().disabled).toBe(false);
    expect(onBusyChange).toHaveBeenLastCalledWith(false);
  });

  it('tells the checkout it is busy while the order is created, so the method and plan stay fixed', async () => {
    const settle = holdCheckout();
    const onBusyChange = vi.fn();
    renderPanel({ onBusyChange });

    fireEvent.click(payButton());

    await waitFor(() => expect(onBusyChange).toHaveBeenLastCalledWith(true));
    expect(payButton().disabled).toBe(true);

    await settle({ payUrl, orderId, amount: 599_000 });
    expect(assign).toHaveBeenCalledWith(payUrl);
  });

  it('stays on the page when the panel closes before the order is created', async () => {
    const settle = holdCheckout();
    const view = renderPanel();

    fireEvent.click(payButton());
    // The buyer closes the checkout sheet, which removes the MoMo panel.
    view.unmount();
    await settle({ payUrl, orderId, amount: 599_000 });

    expect(assign).not.toHaveBeenCalled();
    expect(useQuizStore.getState().momoOrderId).toBeNull();
  });

  it('keeps Pay unpriced and disabled until the plan has a VND price', () => {
    renderPanel({ plan: null });

    expect(payButton().textContent).toBe(copy.payUnpriced);
    expect(payButton().disabled).toBe(true);
  });

  it('shows its own error copy instead of the upstream message when checkout fails', async () => {
    startMomoCheckout.mockRejectedValue(new Error('MoMo checkout is unavailable.'));
    renderPanel();

    fireEvent.click(payButton());

    expect((await screen.findByRole('alert')).textContent).toBe(copy.checkoutError);
    expect(payButton().disabled).toBe(false);
    expect(assign).not.toHaveBeenCalled();
  });
});
