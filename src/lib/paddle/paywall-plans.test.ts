import { describe, expect, it } from 'vitest';
import { paddleExitDiscountId, paddlePaywallDiscountId, paddlePaywallPlans, shouldShowPaddleExitOffer } from './paywall-plans';

describe('paddle paywall catalog', () => {
  it('maps the three paywall durations to permanent Paddle prices', () => {
    expect(paddlePaywallPlans.map((plan) => plan.id)).toEqual(['4-week', '12-week', '52-week']);
    expect(paddlePaywallPlans.every((plan) => plan.priceId.startsWith('pri_'))).toBe(true);
  });

  it('uses the introductory discount created for the paywall catalog', () => {
    expect(paddlePaywallDiscountId).toMatch(/^dsc_/);
  });

  it('maps the exit-intent offer to a separate first-billing Paddle discount', () => {
    expect(paddleExitDiscountId).toMatch(/^dsc_/);
    expect(paddleExitDiscountId).not.toBe(paddlePaywallDiscountId);
  });

  it('shows the exit offer once while the welcome offer is still active', () => {
    expect(shouldShowPaddleExitOffer({ secondsLeft: 1, activeDiscountId: paddlePaywallDiscountId, hasBeenShown: false })).toBe(true);
    expect(shouldShowPaddleExitOffer({ secondsLeft: 0, activeDiscountId: paddlePaywallDiscountId, hasBeenShown: false })).toBe(false);
    expect(shouldShowPaddleExitOffer({ secondsLeft: 1, activeDiscountId: paddleExitDiscountId, hasBeenShown: false })).toBe(false);
    expect(shouldShowPaddleExitOffer({ secondsLeft: 1, activeDiscountId: paddlePaywallDiscountId, hasBeenShown: true })).toBe(false);
  });
});
