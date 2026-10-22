/** @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { copyFor } from '@/lib/copy';
import type { MomoPlanQuote } from '@/lib/payments/momo-checkout';
import { MomoCheckoutPanel } from './momo-checkout-panel';

const fetchMomoPlans = vi.hoisted(() => vi.fn());

vi.mock('@/lib/payments/momo-checkout', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/payments/momo-checkout')>()),
  fetchMomoPlans,
}));

const copy = copyFor('en').momoCheckout;
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
  beforeEach(() => {
    sessionStorage.clear();
    fetchMomoPlans.mockReset();
  });

  afterEach(() => {
    cleanup();
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
});
