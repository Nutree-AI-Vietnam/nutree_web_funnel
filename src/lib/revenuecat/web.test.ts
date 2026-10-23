import { describe, expect, it } from 'vitest';
import { configureRevenueCatForAnonymousCheckout, dismissCheckoutOverlay, paddleCheckoutClosedWithoutPayment, paddleCheckoutCompleted, paddleCheckoutIsOpen, priceTestVariant, readRevenueCatWebConfig } from './web';
import { Purchases } from '@revenuecat/purchases-js';
import { vi } from 'vitest';

vi.mock('@revenuecat/purchases-js', () => ({
  Purchases: { configure: vi.fn(), generateRevenueCatAnonymousAppUserId: vi.fn() },
}));

const environment = {
  NEXT_PUBLIC_REVENUECAT_WEB_API_KEY: 'rcb_test_key',
  NEXT_PUBLIC_REVENUECAT_WEB_OFFERING_ID: 'web_default',
  NEXT_PUBLIC_REVENUECAT_WEB_OFFERING_ID_INTL: 'web_international',
};

describe('RevenueCat Web configuration', () => {
  it('requires only the public API key and offering identifier', () => {
    expect(readRevenueCatWebConfig(environment)).toEqual({ apiKey: 'rcb_test_key', offeringIdentifier: 'web_default' });
    expect(() => readRevenueCatWebConfig({ ...environment, NEXT_PUBLIC_REVENUECAT_WEB_OFFERING_ID: '' })).toThrow('NEXT_PUBLIC_REVENUECAT_WEB_OFFERING_ID');
  });

  it('uses the Vietnam offering only for VN and the international offering for every other country', () => {
    expect(readRevenueCatWebConfig(environment, 'VN').offeringIdentifier).toBe('web_default');
    expect(readRevenueCatWebConfig(environment, 'US').offeringIdentifier).toBe('web_international');
    expect(readRevenueCatWebConfig(environment, 'CA').offeringIdentifier).toBe('web_international');
    expect(() => readRevenueCatWebConfig({ ...environment, NEXT_PUBLIC_REVENUECAT_WEB_OFFERING_ID_INTL: '' }, 'US'))
      .toThrow('NEXT_PUBLIC_REVENUECAT_WEB_OFFERING_ID_INTL');
  });

  it('splits non-Vietnam visitors between the international and test offerings, and keeps each browser in its arm', () => {
    const memory = new Map<string, string>();
    vi.stubGlobal('window', { localStorage: { getItem: (key: string) => memory.get(key) ?? null, setItem: (key: string, value: string) => memory.set(key, value) } });
    const withTest = { ...environment, NEXT_PUBLIC_REVENUECAT_WEB_OFFERING_ID_INTL_TEST: 'web_intro_test' };
    expect(priceTestVariant(environment)).toBeNull();
    expect(priceTestVariant(withTest, () => 0.9)).toBe('test');
    expect(priceTestVariant(withTest, () => 0.1)).toBe('test');
    expect(readRevenueCatWebConfig(withTest, 'US').offeringIdentifier).toBe('web_intro_test');
    expect(readRevenueCatWebConfig(withTest, 'VN').offeringIdentifier).toBe('web_default');
    memory.clear();
    expect(priceTestVariant(withTest, () => 0.1)).toBe('control');
    expect(readRevenueCatWebConfig(withTest, 'US').offeringIdentifier).toBe('web_international');
    vi.unstubAllGlobals();
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
