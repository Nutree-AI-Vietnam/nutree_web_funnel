import { afterEach, describe, expect, it, vi } from 'vitest';
import { claimMomoPurchaseReport, fetchMomoOrderStatus, formatMomoAmount, isMomoPayUrl, isMomoPostcheckout, MOMO_PACKAGE_ID, MOMO_UNAVAILABLE, momoCheckoutFailureDetail, momoOrderIdFrom, momoWeeksForPeriod, startMomoCheckout } from './momo-checkout';

describe('MOMO_PACKAGE_ID', () => {
  it('accepts the card plan packages a MoMo pass can be bought for', () => {
    for (const id of ['$rc_weekly', 'rc_weekly50', '$rc_monthly', 'rc_monthly75', '$rc_six_month', 'rc_6monthly50']) {
      expect(MOMO_PACKAGE_ID.test(id)).toBe(true);
    }
    expect(MOMO_PACKAGE_ID.test('')).toBe(false);
    expect(MOMO_PACKAGE_ID.test('../plans')).toBe(false);
    expect(MOMO_PACKAGE_ID.test('a'.repeat(17))).toBe(false);
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

  it('reports each order once per browser, in storage every tab shares', () => {
    const shared = new Map<string, string>();
    vi.stubGlobal('window', {
      localStorage: {
        getItem: (key: string) => shared.get(key) ?? null,
        setItem: (key: string, value: string) => { shared.set(key, value); },
      },
      get sessionStorage(): Storage {
        throw new Error('the guard must not depend on one tab');
      },
    });
    expect(claimMomoPurchaseReport('a'.repeat(32))).toBe(true);
    expect(claimMomoPurchaseReport('a'.repeat(32))).toBe(false);
    expect(claimMomoPurchaseReport('b'.repeat(32))).toBe(true);
  });

  it('still reports when local storage is unavailable', () => {
    vi.stubGlobal('window', {
      get localStorage(): Storage {
        throw new Error('blocked');
      },
    });
    expect(claimMomoPurchaseReport('a'.repeat(32))).toBe(true);
  });
});

describe('startMomoCheckout', () => {
  const orderId = '7fca4122bc86438a8a2ab4721f8a914d';
  const payUrl = 'https://test-payment.momo.vn/v2/gateway/pay?t=1';

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('names only the package and returns the amount the new order charges', async () => {
    const fetchMock = vi.fn(async () => Response.json({ order_id: orderId, pay_url: payUrl, amount: 599_000 }, { status: 201 }));
    vi.stubGlobal('fetch', fetchMock);
    await expect(startMomoCheckout('rc_6monthly50', 'wallet', 'vi', 'lead-1')).resolves.toEqual({ orderId, payUrl, amount: 599_000 });
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(JSON.parse(String(init.body))).toEqual({ package_id: 'rc_6monthly50', method: 'wallet', lang: 'vi', lead_id: 'lead-1' });
  });

  it('refuses a checkout whose charge it cannot compare with the price shown', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ order_id: orderId, pay_url: payUrl, amount: null }, { status: 201 })));
    await expect(startMomoCheckout('rc_6monthly50', 'wallet', 'vi', 'lead-1')).rejects.toThrow(MOMO_UNAVAILABLE);
  });

  it('sends nothing for a package id it does not recognise', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    await expect(startMomoCheckout('../plans', 'wallet', 'vi', 'lead-1')).rejects.toThrow(MOMO_UNAVAILABLE);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('fetchMomoOrderStatus', () => {
  const orderId = '7fca4122bc86438a8a2ab4721f8a914d';

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns the plan and amount of a paid order', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ order_id: orderId, status: 'paid', plan: 'rc_6monthly50', amount: 599_000 })));
    await expect(fetchMomoOrderStatus(orderId)).resolves.toEqual({ status: 'paid', httpStatus: 200, plan: 'rc_6monthly50', amount: 599_000 });
  });

  it('drops a plan or amount it does not recognise', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ status: 'pending', plan: '<script>', amount: '249000' })));
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

describe('momoWeeksForPeriod', () => {
  it('counts a card plan in weeks the way Nutree names it', () => {
    expect(momoWeeksForPeriod({ number: 1, unit: 'week' })).toBe(1);
    expect(momoWeeksForPeriod({ number: 1, unit: 'month' })).toBe(4);
    expect(momoWeeksForPeriod({ number: 6, unit: 'month' })).toBe(24);
    expect(momoWeeksForPeriod({ number: 1, unit: 'year' })).toBe(52);
    expect(momoWeeksForPeriod(null)).toBeNull();
  });
});
