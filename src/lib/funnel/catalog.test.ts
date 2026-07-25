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
    expect(offer.amount_due_today).toBe(199_000);
    expect(offer.renewal_amount).toBe(199_000);
  });

  it('uses the quarterly international offer as the recommended WELCOME50 plan', () => {
    const context = createFallbackFunnelContext('US');
    const offer = getRecommendedOffer(context.offers);
    expect(offer.id).toBe('intl_quarterly_welcome50');
    expect(offer.amount_due_today).toBe(9.99);
    expect(offer.provider).toBe('PAYPAL');
  });
});

describe('formatOfferAmount', () => {
  it('formats VND without decimals', () => {
    expect(formatOfferAmount(199_000, 'VND')).toBe('199.000đ');
  });

  it('formats USD with cents', () => {
    expect(formatOfferAmount(9.99, 'USD')).toBe('$9.99');
  });
});
