import { describe, expect, it } from 'vitest';
import { createFallbackFunnelContext, getRecommendedOffer } from '@/lib/funnel/catalog';
import { previewAmountDueToday } from '@/lib/funnel/local-last-offer';

describe('previewAmountDueToday', () => {
  it('applies the completed VN 75% exit-intent deal table', () => {
    const context = createFallbackFunnelContext('VN');

    expect(context.offers.map((offer) => ({
      label: offer.label,
      exitDeal: previewAmountDueToday(offer, 75),
    }))).toEqual([
      { label: '4 tuần', exitDeal: 49_000 },
      { label: '12 tuần', exitDeal: 124_000 },
      { label: '52 tuần', exitDeal: 299_000 },
    ]);
  });

  it('applies the completed international 75% exit-intent deal table', () => {
    const context = createFallbackFunnelContext('US');

    expect(context.offers.map((offer) => ({
      label: offer.label,
      exitDeal: previewAmountDueToday(offer, 75),
    }))).toEqual([
      { label: '4-week', exitDeal: 1.99 },
      { label: '12-week', exitDeal: 4.99 },
      { label: '52-week', exitDeal: 11.99 },
    ]);
  });


  it('keeps WELCOME50 prices before the 75% local offer is claimed', () => {
    const context = createFallbackFunnelContext('VN');
    const recommended = getRecommendedOffer(context.offers);

    expect(previewAmountDueToday(recommended, 50)).toBe(249_000);
  });

  it('returns the anchor price after the local offer timer expires', () => {
    const context = createFallbackFunnelContext('VN');
    const recommended = getRecommendedOffer(context.offers);

    expect(previewAmountDueToday(recommended, 0)).toBe(498_000);
  });
});
