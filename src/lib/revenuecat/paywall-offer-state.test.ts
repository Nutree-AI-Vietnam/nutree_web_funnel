import { describe, expect, it } from 'vitest';
import type { Offering, Package } from '@revenuecat/purchases-js';
import { buildRevenueCatPaywall, checkoutPackage } from './paywall-plans';
import { resolvePaywallPricing, type StoredPaywallOffer } from './paywall-offer-state';

const now = 1_000_000;
const base = {
  now,
  exitOfferMode: false,
  unfinishedCheckout: false,
  exitClaimed: false,
  welcomeClaimed: false,
  stored: null as StoredPaywallOffer | null,
  welcomeSeconds: 300,
  exitSeconds: 120,
};

describe('resolvePaywallPricing', () => {
  it('auto-applies the welcome offer when the paywall opens', () => {
    expect(resolvePaywallPricing(base)).toEqual({ mode: 'welcome', expiresAt: now + 300_000, autoApplied: true });
  });

  it('keeps a running welcome offer without requiring the voucher', () => {
    expect(resolvePaywallPricing({
      ...base,
      stored: { kind: 'welcome', expiresAt: now + 50_000 },
    })).toEqual({ mode: 'welcome', expiresAt: now + 50_000 });
    expect(resolvePaywallPricing({
      ...base,
      welcomeClaimed: true,
      stored: { kind: 'welcome', expiresAt: now + 50_000 },
    })).toEqual({ mode: 'welcome', expiresAt: now + 50_000 });
  });

  it('keeps an expired welcome offer expired instead of restarting it', () => {
    expect(resolvePaywallPricing({
      ...base,
      stored: { kind: 'welcome', expiresAt: now - 1 },
    })).toEqual({ mode: 'welcome', expiresAt: now - 1 });
  });

  it('returns to the original price after an exit offer expires', () => {
    expect(resolvePaywallPricing({
      ...base,
      stored: { kind: 'exit', expiresAt: now - 1 },
    })).toEqual({ mode: 'original' });
  });

  it('buys the *50 package for the auto-applied initial offer', () => {
    const pkg = (identifier: string) => ({ identifier, webBillingProduct: { identifier, title: identifier, description: null, period: { number: 1, unit: 'week' } } }) as unknown as Package;
    const weekly = pkg('$rc_weekly');
    const weekly50 = pkg('rc_weekly50');
    const offering = { identifier: 'default', metadata: null, availablePackages: [weekly, weekly50, pkg('rc_weekly75')] } as unknown as Offering;
    const [plan] = buildRevenueCatPaywall(offering).plans;
    const pricing = resolvePaywallPricing(base);
    expect(pricing.mode).toBe('welcome');
    expect(checkoutPackage(plan!, pricing.mode === 'original' ? null : pricing.mode).identifier).toBe('rc_weekly50');
  });

  it('uses the exit discount for an unfinished checkout or an active exit offer', () => {
    expect(resolvePaywallPricing({ ...base, unfinishedCheckout: true }).mode).toBe('exit');
    expect(resolvePaywallPricing({ ...base, exitOfferMode: true }).mode).toBe('exit');
    expect(resolvePaywallPricing({
      ...base,
      stored: { kind: 'exit', expiresAt: now + 5_000 },
    })).toEqual({ mode: 'exit', expiresAt: now + 5_000 });
  });
});
