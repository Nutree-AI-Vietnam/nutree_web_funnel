import { describe, expect, it } from 'vitest';
import { configureRevenueCatForAnonymousCheckout, packagesByPlan, readRevenueCatWebConfig } from './web';
import { Purchases } from '@revenuecat/purchases-js';
import { vi } from 'vitest';

vi.mock('@revenuecat/purchases-js', () => ({
  Purchases: { configure: vi.fn(), generateRevenueCatAnonymousAppUserId: vi.fn() },
}));

const environment = {
  NEXT_PUBLIC_REVENUECAT_WEB_API_KEY: 'rcb_test_key',
  NEXT_PUBLIC_REVENUECAT_WEB_OFFERING_ID: 'web_default',
  NEXT_PUBLIC_REVENUECAT_WEB_PACKAGE_4_WEEK: '$rc_monthly',
  NEXT_PUBLIC_REVENUECAT_WEB_PACKAGE_12_WEEK: '$rc_three_month',
  NEXT_PUBLIC_REVENUECAT_WEB_PACKAGE_52_WEEK: '$rc_annual',
};

describe('RevenueCat Web configuration', () => {
  it('requires the public web config and maps dashboard package identifiers', () => {
    const config = readRevenueCatWebConfig(environment);
    expect(config.plans).toEqual([
      { id: '4-week', packageIdentifier: '$rc_monthly' },
      { id: '12-week', packageIdentifier: '$rc_three_month' },
      { id: '52-week', packageIdentifier: '$rc_annual' },
    ]);
  });

  it('does not guess a package when the configured offering does not contain it', () => {
    const config = readRevenueCatWebConfig(environment);
    const packages = packagesByPlan([{ identifier: '$rc_monthly' }] as never, config.plans);
    expect(packages['4-week']).toEqual({ identifier: '$rc_monthly' });
    expect(packages['12-week']).toBeUndefined();
  });

  it('configures RevenueCat with a generated anonymous customer rather than a lead ID', () => {
    const config = readRevenueCatWebConfig(environment);
    (Purchases.generateRevenueCatAnonymousAppUserId as ReturnType<typeof vi.fn>).mockReturnValue('$RCAnonymousID:customer-1');

    configureRevenueCatForAnonymousCheckout(config);

    expect(Purchases.configure).toHaveBeenCalledWith({ apiKey: 'rcb_test_key', appUserId: '$RCAnonymousID:customer-1' });
  });
});
