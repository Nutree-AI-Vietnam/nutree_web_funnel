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

  it('keeps WELCOME50 prices before the 75% local offer is claimed', () => {
    const context = createFallbackFunnelContext('VN');
    const recommended = getRecommendedOffer(context.offers);

    expect(previewAmountDueToday(recommended, 50)).toBe(249_000);
  });
});
