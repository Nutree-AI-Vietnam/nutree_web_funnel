import type { Product } from '@revenuecat/purchases-js';
import { describe, expect, it } from 'vitest';
import { formatPerDay, periodInDays, planPerDay, savingsVersusPriciest } from './plan-pricing';

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
