/** @vitest-environment jsdom */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { completePurchasedCheckout, isPurchaseHandoffInFlight } from './purchase-handoff';
import { readPendingRedemptionCorrelation } from './redemption-handoff';

const redeemUrl = 'https://redeem.test/token';

describe('purchase handoff navigation', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    sessionStorage.clear();
  });

  it('navigates only after the redemption hash, pending correlation, and RevenueCat correlation finish', async () => {
    const order: string[] = [];
    let releaseCorrelation: () => void = () => {};
    const correlation = new Promise<void>((resolve) => {
      releaseCorrelation = () => {
        order.push('correlate');
        resolve();
      };
    });
    const navigate = vi.fn(() => order.push('navigate'));

    const pending = completePurchasedCheckout({
      markPurchased: () => order.push('purchased'),
      redeemUrl,
      operationSessionId: undefined,
      apiKey: 'rcb_test',
      leadId: 'lead-1',
      appUserId: '$RCAnonymousID:customer-1',
      correlate: () => correlation,
      onRecovery: () => order.push('recovery'),
      onPending: () => order.push('pending-saved'),
      navigate,
    });

    await vi.waitFor(() => expect(order).toContain('pending-saved'));
    expect(isPurchaseHandoffInFlight()).toBe(true);
    expect(navigate).not.toHaveBeenCalled();
    expect(readPendingRedemptionCorrelation()?.leadId).toBe('lead-1');
    expect(order).toEqual(['purchased', 'pending-saved']);

    releaseCorrelation();
    await pending;

    expect(order).toEqual(['purchased', 'pending-saved', 'correlate', 'navigate']);
    expect(isPurchaseHandoffInFlight()).toBe(false);
  });

  it('navigates after the redemption lookup fails', async () => {
    const navigate = vi.fn();
    const onRecovery = vi.fn();
    await completePurchasedCheckout({
      markPurchased: () => undefined,
      redeemUrl: null,
      operationSessionId: undefined,
      apiKey: '',
      leadId: 'lead-1',
      appUserId: '$RCAnonymousID:customer-1',
      correlate: vi.fn(),
      onRecovery,
      onPending: vi.fn(),
      navigate,
    });
    expect(onRecovery).toHaveBeenCalledOnce();
    expect(navigate).toHaveBeenCalledOnce();
    expect(isPurchaseHandoffInFlight()).toBe(false);
    expect(readPendingRedemptionCorrelation()).toBeNull();
  });

  it('navigates when RevenueCat correlation fails', async () => {
    const navigate = vi.fn();
    await completePurchasedCheckout({
      markPurchased: () => undefined,
      redeemUrl,
      operationSessionId: undefined,
      apiKey: 'rcb_test',
      leadId: 'lead-1',
      appUserId: '$RCAnonymousID:customer-1',
      correlate: () => Promise.reject(new Error('timeout')),
      onRecovery: vi.fn(),
      onPending: vi.fn(),
      navigate,
    });
    expect(readPendingRedemptionCorrelation()?.leadId).toBe('lead-1');
    expect(navigate).toHaveBeenCalledOnce();
    expect(isPurchaseHandoffInFlight()).toBe(false);
  });
});
