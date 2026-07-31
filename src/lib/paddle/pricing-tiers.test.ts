import { describe, expect, it } from 'vitest';
import { pricingTiers } from './pricing-tiers';

describe('pricingTiers', () => {
  it('defines the three editable Paddle tiers', () => {
    expect(pricingTiers.map((tier) => tier.name)).toEqual(['Starter', 'Pro', 'Advanced']);
  });

  it('uses Paddle price ids for both billing periods', () => {
    for (const tier of pricingTiers) {
      expect(tier.priceId.month).toMatch(/^pri_/);
      expect(tier.priceId.year).toMatch(/^pri_/);
    }
  });
});

