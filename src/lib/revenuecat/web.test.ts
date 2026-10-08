import { describe, expect, it } from 'vitest';
import { configureRevenueCatForAnonymousCheckout, readRevenueCatWebConfig } from './web';
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
