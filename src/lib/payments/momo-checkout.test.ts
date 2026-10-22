import { afterEach, describe, expect, it, vi } from 'vitest';
import { claimMomoPurchaseReport, fetchMomoOrderStatus, formatMomoAmount, isMomoPayUrl, isMomoPostcheckout, MOMO_UNAVAILABLE, momoCheckoutFailureDetail, momoOrderIdFrom, momoPlanKey } from './momo-checkout';

describe('momoPlanKey', () => {
  it('accepts only the MoMo pass catalog', () => {
    expect(momoPlanKey('monthly')).toBe('monthly');
    expect(momoPlanKey('quarterly')).toBe('quarterly');
    expect(momoPlanKey('yearly')).toBe('yearly');
    expect(() => momoPlanKey('$rc_six_month')).toThrow('Unknown MoMo plan');
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
  it('never shows configuration details to shoppers', () => {
    expect(momoCheckoutFailureDetail({
      detail: { message: 'MoMo is not configured', missing: ['MOMO_PARTNER_CODE', 'MOMO_IPN_URL'] },
    })).toBe(MOMO_UNAVAILABLE);
    expect(MOMO_UNAVAILABLE).not.toMatch(/MOMO_/);
    expect(momoCheckoutFailureDetail({ detail: [{ loc: ['body'] }] })).toBe(MOMO_UNAVAILABLE);
    expect(momoCheckoutFailureDetail(null)).toBe(MOMO_UNAVAILABLE);
  });

  it('keeps a plain backend message', () => {
    expect(momoCheckoutFailureDetail({ detail: 'Unknown MoMo plan' })).toBe('Unknown MoMo plan');
  });
});

describe('isMomoPostcheckout', () => {
  it('recognises the post-checkout link the return page opens', () => {
    expect(isMomoPostcheckout('?method=momo')).toBe(true);
    expect(isMomoPostcheckout('?method=paddle')).toBe(false);
    expect(isMomoPostcheckout('')).toBe(false);
  });
});

describe('claimMomoPurchaseReport', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('reports each order once per tab', () => {
    const values = new Map<string, string>();
    vi.stubGlobal('window', {
      sessionStorage: {
        getItem: (key: string) => values.get(key) ?? null,
        setItem: (key: string, value: string) => { values.set(key, value); },
      },
    });
    expect(claimMomoPurchaseReport('a'.repeat(32))).toBe(true);
    expect(claimMomoPurchaseReport('a'.repeat(32))).toBe(false);
    expect(claimMomoPurchaseReport('b'.repeat(32))).toBe(true);
  });

  it('still reports when session storage is unavailable', () => {
    vi.stubGlobal('window', {
      get sessionStorage(): Storage {
        throw new Error('blocked');
      },
    });
    expect(claimMomoPurchaseReport('a'.repeat(32))).toBe(true);
  });
});

describe('fetchMomoOrderStatus', () => {
  const orderId = '7fca4122bc86438a8a2ab4721f8a914d';

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns the plan and amount of a paid order', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ order_id: orderId, status: 'paid', plan: 'quarterly', amount: 249_000 })));
    await expect(fetchMomoOrderStatus(orderId)).resolves.toEqual({ status: 'paid', httpStatus: 200, plan: 'quarterly', amount: 249_000 });
  });

  it('drops a plan or amount it does not recognise', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ status: 'pending', plan: '$rc_six_month', amount: '249000' })));
    await expect(fetchMomoOrderStatus(orderId)).resolves.toEqual({ status: 'pending', httpStatus: 200, plan: null, amount: null });
  });

  it('reports the HTTP status when the order cannot be read', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ detail: 'Draft session unavailable.' }, { status: 401 })));
    await expect(fetchMomoOrderStatus(orderId)).resolves.toEqual({ status: null, httpStatus: 401, plan: null, amount: null });
  });
});

describe('formatMomoAmount', () => {
  it('formats VND the Vietnamese way', () => {
    expect(formatMomoAmount(1_198_000)).toBe('1.198.000đ');
  });
});
