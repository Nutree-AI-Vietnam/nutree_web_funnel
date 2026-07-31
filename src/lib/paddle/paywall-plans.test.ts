import { describe, expect, it } from 'vitest';
import { paddlePaywallDiscountId, paddlePaywallPlans } from './paywall-plans';

describe('paddle paywall catalog', () => {
  it('maps the three paywall durations to permanent Paddle prices', () => {
    expect(paddlePaywallPlans.map((plan) => plan.id)).toEqual(['4-week', '12-week', '52-week']);
    expect(paddlePaywallPlans.every((plan) => plan.priceId.startsWith('pri_'))).toBe(true);
  });

  it('uses the introductory discount created for the paywall catalog', () => {
    expect(paddlePaywallDiscountId).toMatch(/^dsc_/);
  });
});
