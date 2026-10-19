/** @vitest-environment jsdom */

import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { beginPurchaseHandoff, completePurchasedCheckout, endPurchaseHandoff, resetPurchaseHandoffState } from './purchase-handoff';
import { usePostcheckoutRedirect } from './use-postcheckout-redirect';

const replace = vi.hoisted(() => vi.fn());

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace, push: vi.fn() }),
}));

function RedirectHarness({ ready }: { ready: boolean }) {
  usePostcheckoutRedirect(ready);
  return null;
}

describe('post-checkout redirect', () => {
  afterEach(() => {
    cleanup();
    endPurchaseHandoff();
    resetPurchaseHandoffState();
    replace.mockClear();
  });

  it('waits while the purchase handoff is still running', () => {
    beginPurchaseHandoff();
    render(<RedirectHarness ready />);
    expect(replace).not.toHaveBeenCalled();
  });

  it('leaves once the handoff is not running', () => {
    render(<RedirectHarness ready />);
    expect(replace).toHaveBeenCalledWith('/postcheckout');
  });

  it('stays put before a purchase', () => {
    render(<RedirectHarness ready={false} />);
    expect(replace).not.toHaveBeenCalled();
  });

  it('stays on the paywall when the redemption hash is missing', async () => {
    await completePurchasedCheckout({
      markPurchased: () => undefined,
      redeemUrl: null,
      operationSessionId: undefined,
      apiKey: '',
      leadId: 'lead-1',
      appUserId: '$RCAnonymousID:customer-1',
      correlate: vi.fn(),
      onRecovery: vi.fn(),
      onPending: vi.fn(),
      navigate: vi.fn(),
    });
    render(<RedirectHarness ready />);
    expect(replace).not.toHaveBeenCalled();
  });
});
