import { describe, expect, it } from 'vitest';
import { configureRevenueCatForAnonymousCheckout, discountedAmount, discountedFormattedPrice, readRevenueCatWebConfig } from './web';
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
  it('sends the Paddle discount codes used by the live checkout', async () => {
    const { WELCOME_DISCOUNT_CODE, EXIT_DISCOUNT_CODE } = await import('./web');
    expect(WELCOME_DISCOUNT_CODE).toBe('WELCOME50');
    expect(EXIT_DISCOUNT_CODE).toBe('LASTCHANCE75');
  });

  it('calculates a provider-price discount using the currency returned by RevenueCat', () => {
    expect(discountedFormattedPrice({ amountMicros: 19_990_000, amount: 19.99, currency: 'USD', formattedPrice: '$19.99' }, 'en-US')).toBe('$10.00');
    expect(discountedFormattedPrice({ amountMicros: 499_000_000_000, amount: 499_000, currency: 'VND', formattedPrice: '₫499,000' }, 'vi-VN')).toBe('249.500 ₫');
    expect(discountedAmount({ amountMicros: 499_000_000_000, amount: 499_000, currency: 'VND', formattedPrice: '₫499,000' }, 50)).toBe(249_500);
  });

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
