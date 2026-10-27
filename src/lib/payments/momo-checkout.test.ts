import { afterEach, describe, expect, it, vi } from 'vitest';
import { claimMomoPurchaseReport, fetchMomoOrderStatus, fetchMomoPlans, formatMomoAmount, isMomoPayUrl, isMomoPostcheckout, MOMO_UNAVAILABLE, momoCheckoutFailureDetail, momoOrderIdFrom, momoPlanKey, momoQuoteForWeeks, momoWeeksForPeriod, startMomoCheckout } from './momo-checkout';

describe('momoPlanKey', () => {
  it('accepts only the MoMo pass catalog', () => {
    expect(momoPlanKey('weekly')).toBe('weekly');
    expect(momoPlanKey('six_month')).toBe('six_month');
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

  it('returns the amount the new order charges', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ order_id: orderId, pay_url: payUrl, amount: 498_000 }, { status: 201 })));
    await expect(startMomoCheckout('quarterly', 'wallet', 'vi', 'lead-1')).resolves.toEqual({ orderId, payUrl, amount: 498_000 });
  });

  it('refuses a checkout whose charge it cannot compare with the price shown', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ order_id: orderId, pay_url: payUrl, amount: null }, { status: 201 })));
    await expect(startMomoCheckout('quarterly', 'wallet', 'vi', 'lead-1')).rejects.toThrow(MOMO_UNAVAILABLE);
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

describe('passes for card plans', () => {
  const quotes = [
    { plan: 'weekly' as const, weeks: 1, amount: 39_000, regular_amount: 79_000, intro: true },
    { plan: 'monthly' as const, weeks: 4, amount: 99_000, regular_amount: 199_000, intro: true },
    { plan: 'six_month' as const, weeks: 24, amount: 799_000, regular_amount: 1_599_000, intro: true },
  ];

  it('counts a card plan in weeks the way Nutree names it', () => {
    expect(momoWeeksForPeriod({ number: 1, unit: 'week' })).toBe(1);
    expect(momoWeeksForPeriod({ number: 1, unit: 'month' })).toBe(4);
    expect(momoWeeksForPeriod({ number: 6, unit: 'month' })).toBe(24);
    expect(momoWeeksForPeriod({ number: 1, unit: 'year' })).toBe(52);
    expect(momoWeeksForPeriod(null)).toBeNull();
  });

  it('picks the pass of the same length, or none', () => {
    expect(momoQuoteForWeeks(quotes, 24)?.plan).toBe('six_month');
    expect(momoQuoteForWeeks(quotes, 12)).toBeNull();
    expect(momoQuoteForWeeks(quotes, null)).toBeNull();
  });
});

describe('fetchMomoPlans', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('keeps every pass it recognises, whichever catalog the API serves', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ plans: [
      { plan: 'monthly', weeks: 4, amount: 99_000, regular_amount: 198_000, intro: true },
      { plan: 'quarterly', weeks: 12, amount: 249_000, regular_amount: 498_000, intro: true },
      { plan: 'lifetime', weeks: 0, amount: 1, regular_amount: 1, intro: true },
    ] })));
    await expect(fetchMomoPlans('lead-1')).resolves.toEqual([
      { plan: 'monthly', weeks: 4, amount: 99_000, regular_amount: 198_000, intro: true },
      { plan: 'quarterly', weeks: 12, amount: 249_000, regular_amount: 498_000, intro: true },
    ]);
  });

  it('fails when no pass can be priced', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ plans: [] })));
    await expect(fetchMomoPlans('lead-1')).rejects.toThrow('MoMo prices are unavailable.');
  });
});
