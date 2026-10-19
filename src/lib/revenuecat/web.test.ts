import { describe, expect, it } from 'vitest';
import { configureRevenueCatForAnonymousCheckout, dismissCheckoutOverlay, paddleCheckoutClosedWithoutPayment, paddleCheckoutCompleted, paddleCheckoutIsOpen, readRevenueCatWebConfig } from './web';
import { Purchases } from '@revenuecat/purchases-js';
import { vi } from 'vitest';

vi.mock('@revenuecat/purchases-js', () => ({
  Purchases: { configure: vi.fn(), generateRevenueCatAnonymousAppUserId: vi.fn() },
}));

const environment = {
  NEXT_PUBLIC_REVENUECAT_WEB_API_KEY: 'rcb_test_key',
  NEXT_PUBLIC_REVENUECAT_WEB_OFFERING_ID: 'web_default',
};

describe('RevenueCat Web configuration', () => {
  it('requires only the public API key and offering identifier', () => {
    expect(readRevenueCatWebConfig(environment)).toEqual({ apiKey: 'rcb_test_key', offeringIdentifier: 'web_default' });
    expect(() => readRevenueCatWebConfig({ ...environment, NEXT_PUBLIC_REVENUECAT_WEB_OFFERING_ID: '' })).toThrow('NEXT_PUBLIC_REVENUECAT_WEB_OFFERING_ID');
  });

  it('configures RevenueCat with a generated anonymous customer rather than a lead ID', () => {
    const config = readRevenueCatWebConfig(environment);
    (Purchases.generateRevenueCatAnonymousAppUserId as ReturnType<typeof vi.fn>).mockReturnValue('$RCAnonymousID:customer-1');

    configureRevenueCatForAnonymousCheckout(config);

    expect(Purchases.configure).toHaveBeenCalledWith({ apiKey: 'rcb_test_key', appUserId: '$RCAnonymousID:customer-1' });
  });
});

describe('paddleCheckoutIsOpen', () => {
  it('is true only after the Paddle checkout frame is present', () => {
    const closed = { querySelector: () => null } as unknown as ParentNode;
    const open = { querySelector: (selector: string) => (selector.includes('paddle.com') ? {} : null) } as unknown as ParentNode;
    expect(paddleCheckoutIsOpen(closed)).toBe(false);
    expect(paddleCheckoutIsOpen(open)).toBe(true);
    expect(paddleCheckoutIsOpen(null)).toBe(false);
  });
});

describe('paddleCheckoutClosedWithoutPayment', () => {
  it('treats a closed checkout as unfinished unless the payment completed', () => {
    expect(paddleCheckoutClosedWithoutPayment({ name: 'checkout.closed', data: { status: 'abandoned' } })).toBe(true);
    expect(paddleCheckoutClosedWithoutPayment({ event_name: 'checkout.closed' })).toBe(true);
    expect(paddleCheckoutClosedWithoutPayment({ name: 'checkout.closed', data: { status: 'completed' } })).toBe(false);
    expect(paddleCheckoutClosedWithoutPayment({ name: 'checkout.loaded' })).toBe(false);
    expect(paddleCheckoutCompleted({ name: 'checkout.completed' })).toBe(true);
    expect(paddleCheckoutCompleted({ name: 'checkout.closed' })).toBe(false);
  });

  it('removes the checkout layer', () => {
    const overlay = { remove: vi.fn() };
    const root = { querySelectorAll: () => [overlay] } as unknown as ParentNode;
    dismissCheckoutOverlay(root);
    expect(overlay.remove).toHaveBeenCalledOnce();
  });
});
