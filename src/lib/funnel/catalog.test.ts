import { describe, expect, it } from 'vitest';
import {
  createFallbackFunnelContext,
  formatOfferAmount,
  getRecommendedOffer,
  resolveMarket,
} from './catalog';

describe('resolveMarket', () => {
  it('routes Vietnam billing country to MoMo and VND', () => {
    expect(resolveMarket('VN')).toEqual({ market: 'VN', provider: 'MOMO', currency: 'VND' });
    expect(resolveMarket('vn')).toEqual({ market: 'VN', provider: 'MOMO', currency: 'VND' });
  });

  it('routes non-Vietnam billing countries to PayPal and USD', () => {
    expect(resolveMarket('SG')).toEqual({ market: 'INTL', provider: 'PAYPAL', currency: 'USD' });
    expect(resolveMarket(undefined)).toEqual({ market: 'INTL', provider: 'PAYPAL', currency: 'USD' });
  });
});

describe('fallback catalog', () => {
  it('uses the quarterly Vietnam offer as the recommended WELCOME50 plan', () => {
    const context = createFallbackFunnelContext('VN');
    const offer = getRecommendedOffer(context.offers);
    expect(offer.id).toBe('vn_quarterly_welcome50');
    expect(offer.standard_amount).toBe(498_000);
    expect(offer.amount_due_today).toBe(249_000);
    expect(offer.renewal_amount).toBe(498_000);
  });

  it('uses the completed Vietnam WELCOME50 plan table', () => {
    const context = createFallbackFunnelContext('VN');
    expect(context.offers.map((offer) => ({
      label: offer.label,
      standard: offer.standard_amount,
      welcome: offer.amount_due_today,
      renewal: offer.renewal_amount,
    }))).toEqual([
      { label: '4 tuần', standard: 198_000, welcome: 99_000, renewal: 198_000 },
      { label: '12 tuần', standard: 498_000, welcome: 249_000, renewal: 498_000 },
      { label: '52 tuần', standard: 1_198_000, welcome: 599_000, renewal: 1_198_000 },
    ]);
  });

  it('uses the quarterly international offer as the recommended WELCOME50 plan', () => {
    const context = createFallbackFunnelContext('US');
    const offer = getRecommendedOffer(context.offers);
    expect(offer.id).toBe('intl_quarterly_welcome50');
    expect(offer.amount_due_today).toBe(9.99);
    expect(offer.provider).toBe('PAYPAL');
  });

  it('uses the completed international WELCOME50 plan table', () => {
    const context = createFallbackFunnelContext('US');
    expect(context.offers.map((offer) => ({
      label: offer.label,
      standard: offer.standard_amount,
      welcome: offer.amount_due_today,
      renewal: offer.renewal_amount,
    }))).toEqual([
      { label: '4-week', standard: 7.99, welcome: 3.99, renewal: 7.99 },
      { label: '12-week', standard: 19.99, welcome: 9.99, renewal: 19.99 },
      { label: '52-week', standard: 47.99, welcome: 23.99, renewal: 47.99 },
    ]);
  });
});

describe('formatOfferAmount', () => {
  it('formats VND without decimals', () => {
    expect(formatOfferAmount(249_000, 'VND')).toBe('249.000đ');
  });

  it('formats USD with cents', () => {
    expect(formatOfferAmount(9.99, 'USD')).toBe('$9.99');
  });
});
