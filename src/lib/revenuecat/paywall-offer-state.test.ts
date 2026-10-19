import { describe, expect, it } from 'vitest';
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
  it('keeps the original price before any voucher is claimed', () => {
    expect(resolvePaywallPricing(base)).toEqual({ mode: 'original' });
    expect(resolvePaywallPricing({
      ...base,
      stored: { kind: 'welcome', expiresAt: now + 10_000 },
    })).toEqual({ mode: 'original' });
  });

  it('applies a claimed welcome voucher that is still running', () => {
    expect(resolvePaywallPricing({
      ...base,
      welcomeClaimed: true,
      stored: { kind: 'welcome', expiresAt: now + 50_000 },
    })).toEqual({ mode: 'welcome', expiresAt: now + 50_000 });
  });

  it('returns to the original price after the welcome voucher expires', () => {
    expect(resolvePaywallPricing({
      ...base,
      welcomeClaimed: true,
      stored: { kind: 'welcome', expiresAt: now - 1 },
    })).toEqual({ mode: 'original' });
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
