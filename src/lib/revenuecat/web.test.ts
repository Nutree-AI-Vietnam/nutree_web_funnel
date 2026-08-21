import { describe, expect, it } from 'vitest';
import { configureRevenueCatForAnonymousCheckout, discountedFormattedPrice, packagesByPlan, readRevenueCatWebConfig } from './web';
import { createRevenueCatPaywallPlans } from './paywall-plans';
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
  it('calculates a provider-price discount using the currency returned by RevenueCat', () => {
    expect(discountedFormattedPrice({ amountMicros: 19_990_000, amount: 19.99, currency: 'USD', formattedPrice: '$19.99' }, 'en-US')).toBe('$10.00');
    expect(discountedFormattedPrice({ amountMicros: 499_000_000_000, amount: 499_000, currency: 'VND', formattedPrice: '₫499,000' }, 'vi-VN')).toBe('249.500 ₫');
  });

  it('requires the public web config and maps dashboard package identifiers', () => {
    const config = readRevenueCatWebConfig(environment);
    expect(config.plans).toEqual([
      { id: '52-week', packageIdentifier: '$rc_annual' },
      { id: '4-week', packageIdentifier: '$rc_monthly' },
      { id: '12-week', packageIdentifier: '$rc_three_month' },
    ]);
  });

  it('does not guess a package when the configured offering does not contain it', () => {
    const config = readRevenueCatWebConfig(environment);
    const packages = packagesByPlan([{ identifier: '$rc_monthly' }] as never, config.plans);
    expect(packages['4-week']).toEqual({ identifier: '$rc_monthly' });
    expect(packages['12-week']).toBeUndefined();
  });

  it('switches the configured final package and paywall copy to one week', () => {
    const config = readRevenueCatWebConfig({
      ...environment,
      NEXT_PUBLIC_REVENUECAT_WEB_1_WEEK_ENABLED: 'true',
      NEXT_PUBLIC_REVENUECAT_WEB_PACKAGE_1_WEEK: '$rc_weekly',
    });

    expect(config.plans[0]).toEqual({ id: '1-week', packageIdentifier: '$rc_weekly' });
    expect(createRevenueCatPaywallPlans(true)).toEqual([
      expect.objectContaining({ id: '1-week' }),
      expect.objectContaining({ id: '4-week' }),
      expect.objectContaining({ id: '12-week' }),
    ]);
    expect(createRevenueCatPaywallPlans(true)[0]).toMatchObject({
      id: '1-week',
      label: { en: '1-week', vi: '1 tuần' },
      billingLabel: { en: 'Every 1 week', vi: 'Mỗi 1 tuần' },
    });
    expect(createRevenueCatPaywallPlans(false).map((plan) => plan.id)).toEqual(['52-week', '4-week', '12-week']);
  });

  it('allows the server-selected toggle to stay aligned with the client paywall', () => {
    expect(readRevenueCatWebConfig({ ...environment, NEXT_PUBLIC_REVENUECAT_WEB_PACKAGE_1_WEEK: '$rc_weekly' }, true).plans[0]?.id).toBe('1-week');
    expect(readRevenueCatWebConfig(environment, false).plans[0]?.id).toBe('52-week');
  });

  it('uses the available one-week package when the optional toggle and 52-week package are absent', () => {
    expect(readRevenueCatWebConfig({
      ...environment,
      NEXT_PUBLIC_REVENUECAT_WEB_PACKAGE_1_WEEK: '$rc_weekly',
      NEXT_PUBLIC_REVENUECAT_WEB_PACKAGE_52_WEEK: '',
    }).plans[0]?.id).toBe('1-week');
  });

  it('configures RevenueCat with a generated anonymous customer rather than a lead ID', () => {
    const config = readRevenueCatWebConfig(environment);
    (Purchases.generateRevenueCatAnonymousAppUserId as ReturnType<typeof vi.fn>).mockReturnValue('$RCAnonymousID:customer-1');

    configureRevenueCatForAnonymousCheckout(config);

    expect(Purchases.configure).toHaveBeenCalledWith({ apiKey: 'rcb_test_key', appUserId: '$RCAnonymousID:customer-1' });
  });
});
