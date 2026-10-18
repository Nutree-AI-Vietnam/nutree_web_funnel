import { describe, expect, it } from 'vitest';
import { shouldArmExitVoucher } from './welcome-voucher';

describe('shouldArmExitVoucher', () => {
  const openPaywall = {
    discountActive: false,
    checkoutOpen: false,
    purchased: false,
  };

  it('arms while the paywall is showing the original price', () => {
    expect(shouldArmExitVoucher(openPaywall)).toBe(true);
  });

  it('stays quiet while a discount is active, during checkout, or after purchase', () => {
    expect(shouldArmExitVoucher({ ...openPaywall, discountActive: true })).toBe(false);
    expect(shouldArmExitVoucher({ ...openPaywall, checkoutOpen: true })).toBe(false);
    expect(shouldArmExitVoucher({ ...openPaywall, purchased: true })).toBe(false);
  });
});
