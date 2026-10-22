import { describe, expect, it } from 'vitest';
import { DEFAULT_MOMO_PLANS, formatMomoAmount, isMomoPayUrl, momoCheckoutFailureDetail, momoOrderIdFrom, momoPlanKey } from './momo-checkout';

describe('momoPlanKey', () => {
  it('accepts only the MoMo pass catalog', () => {
    expect(momoPlanKey('monthly')).toBe('monthly');
    expect(momoPlanKey('quarterly')).toBe('quarterly');
    expect(momoPlanKey('yearly')).toBe('yearly');
    expect(() => momoPlanKey('$rc_six_month')).toThrow('Unknown MoMo plan');
  });

  it('starts every pass at the intro price until the backend quotes', () => {
    expect(DEFAULT_MOMO_PLANS.map((plan) => [plan.plan, plan.amount, plan.regular_amount])).toEqual([
      ['monthly', 99_000, 198_000],
      ['quarterly', 249_000, 498_000],
      ['yearly', 599_000, 1_198_000],
    ]);
  });
});

describe('isMomoPayUrl', () => {
  it('opens only an https MoMo pay link', () => {
    expect(isMomoPayUrl('https://test-payment.momo.vn/v2/gateway/pay?t=1')).toBe(true);
    expect(isMomoPayUrl('https://payment.momo.vn/v2/gateway/pay?t=1')).toBe(true);
    expect(isMomoPayUrl('https://notmomo.vn/pay')).toBe(false);
    expect(isMomoPayUrl('https://momo.vn.evil.example/pay')).toBe(false);
    expect(isMomoPayUrl('http://payment.momo.vn/pay')).toBe(false);
  });
});

describe('momoOrderIdFrom', () => {
  const orderId = '7fca4122bc86438a8a2ab4721f8a914d';

  it('reads the order id MoMo appends to the return URL', () => {
    expect(momoOrderIdFrom(new URLSearchParams({ orderId, resultCode: '1006' }))).toBe(orderId);
    expect(momoOrderIdFrom(new URLSearchParams({ order_id: orderId }))).toBe(orderId);
  });

  it('ignores anything that is not one of our order ids', () => {
    expect(momoOrderIdFrom(new URLSearchParams({ orderId: '../leads' }))).toBeNull();
    expect(momoOrderIdFrom(new URLSearchParams())).toBeNull();
  });
});

describe('momoCheckoutFailureDetail', () => {
  it('names the MoMo settings that are still empty', () => {
    expect(momoCheckoutFailureDetail({
      detail: { message: 'MoMo is not configured', missing: ['MOMO_PARTNER_CODE', 'MOMO_IPN_URL'] },
    })).toBe('MoMo is not configured. Add MOMO_PARTNER_CODE, MOMO_IPN_URL.');
    expect(momoCheckoutFailureDetail({ detail: 'Unknown MoMo plan' })).toBe('Unknown MoMo plan');
    expect(momoCheckoutFailureDetail({ detail: [{ loc: ['body'] }] })).toBe('MoMo checkout is unavailable.');
  });
});

describe('formatMomoAmount', () => {
  it('formats VND the Vietnamese way', () => {
    expect(formatMomoAmount(1_198_000)).toBe('1.198.000đ');
  });
});
