/** @vitest-environment jsdom */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { completePurchasedCheckout, isPostcheckoutRedirectHeld, isPurchaseHandoffInFlight, PURCHASE_CALL_TIMEOUT_MS, PURCHASE_HANDOFF_TIMEOUT_MS, resetPurchaseHandoffState } from './purchase-handoff';
import { readPendingRedemptionCorrelation } from './redemption-handoff';

const redeemUrl = 'https://redeem.test/token';

function useHandoffTimers() {
  vi.spyOn(crypto.subtle, 'digest').mockResolvedValue(new Uint8Array(32).buffer);
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
}

async function flushWork() {
  for (let step = 0; step < 30; step += 1) {
    await vi.advanceTimersByTimeAsync(0);
    await new Promise((resolve) => setImmediate(resolve));
  }
}

describe('purchase handoff navigation', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    sessionStorage.clear();
    resetPurchaseHandoffState();
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

  it('stays on the paywall recovery state when the redemption hash is missing', async () => {
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
    expect(navigate).not.toHaveBeenCalled();
    expect(isPostcheckoutRedirectHeld()).toBe(true);
    expect(isPurchaseHandoffInFlight()).toBe(false);
    expect(readPendingRedemptionCorrelation()).toBeNull();
  });

  it('navigates when a RevenueCat call never resolves and keeps the pending record', async () => {
    useHandoffTimers();
    const navigate = vi.fn();
    const pending = completePurchasedCheckout({
      markPurchased: () => undefined,
      redeemUrl,
      operationSessionId: undefined,
      apiKey: 'rcb_test',
      leadId: 'lead-1',
      appUserId: '$RCAnonymousID:customer-1',
      correlate: () => new Promise(() => undefined),
      onRecovery: vi.fn(),
      onPending: vi.fn(),
      navigate,
    });

    await flushWork();
    expect(readPendingRedemptionCorrelation()?.leadId).toBe('lead-1');
    expect(navigate).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(PURCHASE_CALL_TIMEOUT_MS);
    await pending;

    expect(navigate).toHaveBeenCalledOnce();
    expect(readPendingRedemptionCorrelation()?.leadId).toBe('lead-1');
    expect(isPurchaseHandoffInFlight()).toBe(false);
  });

  it('stays on the recovery state when lookup requests never resolve', async () => {
    useHandoffTimers();
    let calls = 0;
    const navigate = vi.fn();
    const onRecovery = vi.fn();
    const checkoutFetcher: typeof fetch = () => {
      calls += 1;
      return new Promise(() => undefined);
    };
    const pending = completePurchasedCheckout({
      markPurchased: () => undefined,
      redeemUrl: null,
      operationSessionId: 'op-1',
      apiKey: 'rcb_test',
      leadId: 'lead-1',
      appUserId: '$RCAnonymousID:customer-1',
      checkoutFetcher,
      correlate: vi.fn(),
      onRecovery,
      onPending: vi.fn(),
      navigate,
    });

    await vi.advanceTimersByTimeAsync(PURCHASE_HANDOFF_TIMEOUT_MS);
    await pending;

    expect(onRecovery).toHaveBeenCalledOnce();
    expect(navigate).not.toHaveBeenCalled();
    expect(isPostcheckoutRedirectHeld()).toBe(true);
    expect(readPendingRedemptionCorrelation()).toBeNull();
    expect(calls).toBeGreaterThan(1);
    expect(calls).toBeLessThan(8);
    expect(isPurchaseHandoffInFlight()).toBe(false);
  });

  it('stays on the recovery state when lookup headers arrive but the body never finishes', async () => {
    useHandoffTimers();
    let calls = 0;
    const navigate = vi.fn();
    const onRecovery = vi.fn();
    const checkoutFetcher: typeof fetch = () => {
      calls += 1;
      return Promise.resolve({
        ok: true,
        json: () => new Promise(() => undefined),
      } as unknown as Response);
    };
    const pending = completePurchasedCheckout({
      markPurchased: () => undefined,
      redeemUrl: null,
      operationSessionId: 'op-1',
      apiKey: 'rcb_test',
      leadId: 'lead-1',
      appUserId: '$RCAnonymousID:customer-1',
      checkoutFetcher,
      correlate: vi.fn(),
      onRecovery,
      onPending: vi.fn(),
      navigate,
    });

    await vi.advanceTimersByTimeAsync(PURCHASE_HANDOFF_TIMEOUT_MS);
    await pending;

    expect(onRecovery).toHaveBeenCalledOnce();
    expect(navigate).not.toHaveBeenCalled();
    expect(isPostcheckoutRedirectHeld()).toBe(true);
    expect(readPendingRedemptionCorrelation()).toBeNull();
    expect(calls).toBeGreaterThan(1);
    expect(calls).toBeLessThan(8);
    expect(isPurchaseHandoffInFlight()).toBe(false);
  });

  it('keeps polling a slow lookup and navigates once a later try publishes the link', async () => {
    useHandoffTimers();
    let calls = 0;
    const navigate = vi.fn();
    const onRecovery = vi.fn();
    const checkoutFetcher: typeof fetch = async () => {
      calls += 1;
      const body = calls < 6
        ? { operation: { redemption_info: null } }
        : { operation: { redemption_info: { redeem_url: redeemUrl } } };
      return new Response(JSON.stringify(body), { status: 200 });
    };
    const pending = completePurchasedCheckout({
      markPurchased: () => undefined,
      redeemUrl: null,
      operationSessionId: 'op-1',
      apiKey: 'rcb_test',
      leadId: 'lead-1',
      appUserId: '$RCAnonymousID:customer-1',
      checkoutFetcher,
      correlate: async () => undefined,
      onRecovery,
      onPending: vi.fn(),
      navigate,
    });

    await vi.advanceTimersByTimeAsync(5_000);
    await flushWork();
    await pending;

    expect(calls).toBe(6);
    expect(onRecovery).not.toHaveBeenCalled();
    expect(readPendingRedemptionCorrelation()?.leadId).toBe('lead-1');
    expect(navigate).toHaveBeenCalledOnce();
    expect(isPostcheckoutRedirectHeld()).toBe(false);
  });

  it('navigates when the whole handoff reaches its bound and keeps the pending record', async () => {
    useHandoffTimers();
    const navigate = vi.fn();
    const pending = completePurchasedCheckout({
      markPurchased: () => undefined,
      redeemUrl,
      operationSessionId: undefined,
      apiKey: 'rcb_test',
      leadId: 'lead-1',
      appUserId: '$RCAnonymousID:customer-1',
      correlate: () => new Promise(() => undefined),
      onRecovery: vi.fn(),
      onPending: vi.fn(),
      navigate,
      callTimeoutMs: PURCHASE_HANDOFF_TIMEOUT_MS + 1_000,
      handoffTimeoutMs: PURCHASE_HANDOFF_TIMEOUT_MS,
    });

    await flushWork();
    expect(readPendingRedemptionCorrelation()?.leadId).toBe('lead-1');
    expect(navigate).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(PURCHASE_HANDOFF_TIMEOUT_MS);
    await pending;

    expect(navigate).toHaveBeenCalledOnce();
    expect(readPendingRedemptionCorrelation()?.leadId).toBe('lead-1');
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
