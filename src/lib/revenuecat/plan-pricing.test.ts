import type { Product } from '@revenuecat/purchases-js';
import { describe, expect, it } from 'vitest';
import { discountPercent, firstPaymentCommerce, formatPerDay, offerClaim, periodInDays, planPerDay, savingsVersusPriciest } from './plan-pricing';

function product(amount: number, period: { number: number; unit: string }, currency = 'VND', intro?: { amount: number; period: { number: number; unit: string } }): Product {
  return {
    price: { amountMicros: amount * 1_000_000, currency, formattedPrice: String(amount) },
    period,
    introPricePhase: intro ? { price: { amountMicros: intro.amount * 1_000_000, currency, formattedPrice: String(intro.amount) }, period: intro.period } : null,
  } as unknown as Product;
}

describe('periodInDays', () => {
  it('converts every RevenueCat period unit', () => {
    expect(periodInDays({ number: 2, unit: 'day' } as never)).toBe(2);
    expect(periodInDays({ number: 4, unit: 'week' } as never)).toBe(28);
    expect(periodInDays({ number: 1, unit: 'year' } as never)).toBe(365);
    expect(periodInDays({ number: 6, unit: 'month' } as never)).toBeCloseTo(182.5);
    expect(periodInDays(null)).toBeNull();
    expect(periodInDays({ number: 0, unit: 'week' } as never)).toBeNull();
  });
});

describe('planPerDay', () => {
  it('divides the first payment by the billing period', () => {
    expect(planPerDay(product(129_000, { number: 1, unit: 'week' }))?.amount).toBeCloseTo(18_428.57, 1);
  });

  it('applies the offer discount to the daily price', () => {
    expect(planPerDay(product(129_000, { number: 1, unit: 'week' }), 50)?.amount).toBeCloseTo(9_214.29, 1);
  });

  it('uses the intro price and intro period when RevenueCat provides one', () => {
    const withIntro = product(399_000, { number: 1, unit: 'month' }, 'VND', { amount: 70_000, period: { number: 1, unit: 'week' } });
    expect(planPerDay(withIntro)?.amount).toBeCloseTo(10_000, 5);
  });

  it('returns null without a usable period or currency', () => {
    expect(planPerDay(product(100, null as never))).toBeNull();
    expect(planPerDay(product(100, { number: 1, unit: 'week' }, 'đ'))).toBeNull();
    expect(planPerDay(null)).toBeNull();
    expect(planPerDay(product(100, { number: 1, unit: 'week' }), 120)).toBeNull();
  });
});

describe('firstPaymentCommerce', () => {
  it('reports the paid intro price, else the regular price, in major units', () => {
    const withIntro = product(399_000, { number: 1, unit: 'month' }, 'VND', { amount: 70_000, period: { number: 1, unit: 'week' } });
    expect(firstPaymentCommerce(withIntro)).toEqual({ value: 70_000, currency: 'VND' });
    expect(firstPaymentCommerce(product(9.99, { number: 1, unit: 'month' }, 'USD'))).toEqual({ value: 9.99, currency: 'USD' });
  });

  it('skips a free intro phase and returns nothing without a usable price', () => {
    const freeIntro = product(399_000, { number: 1, unit: 'month' }, 'VND', { amount: 0, period: { number: 1, unit: 'week' } });
    expect(firstPaymentCommerce(freeIntro)).toEqual({ value: 399_000, currency: 'VND' });
    expect(firstPaymentCommerce(product(0, { number: 1, unit: 'month' }))).toEqual({});
    expect(firstPaymentCommerce(product(100, { number: 1, unit: 'month' }, 'đ'))).toEqual({});
    expect(firstPaymentCommerce(null)).toEqual({});
  });
});

describe('discountPercent', () => {
  const micros = (amount: number) => Math.round(amount * 1_000_000);

  it('rounds the real saving down to a whole percent', () => {
    expect(discountPercent(micros(4.99), micros(2.99))).toBe(40);
    expect(discountPercent(micros(42.99), micros(23.99))).toBe(44);
    expect(discountPercent(micros(15.99), micros(7.99))).toBe(50);
    expect(discountPercent(micros(4.99), micros(2.49))).toBe(50);
    expect(discountPercent(micros(42.99), micros(21.49))).toBe(50);
  });

  it('is 0 without a saving or a usable price', () => {
    expect(discountPercent(micros(4.99), micros(4.99))).toBe(0);
    expect(discountPercent(micros(4.99), micros(5.99))).toBe(0);
    expect(discountPercent(0, 0)).toBe(0);
    expect(discountPercent(micros(4.99), Number.NaN)).toBe(0);
  });
});

describe('offerClaim', () => {
  it('claims the largest discount, "up to" when the plans differ', () => {
    expect(offerClaim([40, 50, 44])).toEqual({ percent: 50, upTo: true });
    expect(offerClaim([50, 50, 50])).toEqual({ percent: 50, upTo: false });
  });

  it('says "up to" when a plan has no discount, and claims nothing when none has one', () => {
    expect(offerClaim([0, 50, 50])).toEqual({ percent: 50, upTo: true });
    expect(offerClaim([50, 0, 50])).toEqual({ percent: 50, upTo: true });
    expect(offerClaim([0, 0])).toBeNull();
    expect(offerClaim([])).toBeNull();
  });
});

describe('formatPerDay', () => {
  it('rounds VND to the nearest 100 and keeps two decimals for USD', () => {
    expect(formatPerDay({ amount: 18_428.57, currency: 'VND' }, 'vi-VN')?.replace(/\s/g, ' ')).toBe('18.400 ₫');
    expect(formatPerDay({ amount: 0.1428, currency: 'USD' }, 'en-US')).toBe('$0.14');
    expect(formatPerDay(null, 'en-US')).toBeNull();
  });
});

describe('savingsVersusPriciest', () => {
  it('reports the saving against the most expensive plan per day and skips tiny gaps', () => {
    const savings = savingsVersusPriciest({
      weekly: { amount: 18_428, currency: 'VND' },
      monthly: { amount: 13_117, currency: 'VND' },
      sixMonth: { amount: 6_022, currency: 'VND' },
      similar: { amount: 18_000, currency: 'VND' },
    });
    expect(savings).toEqual({ monthly: 29, sixMonth: 67 });
  });

  it('ignores missing prices and other currencies', () => {
    expect(savingsVersusPriciest({ a: null, b: null })).toEqual({});
    expect(savingsVersusPriciest({ a: { amount: 10, currency: 'VND' }, b: { amount: 1, currency: 'USD' }, c: { amount: 5, currency: 'VND' } })).toEqual({ c: 50 });
  });
});
