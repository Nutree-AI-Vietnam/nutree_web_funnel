import { describe, expect, it } from 'vitest';
import { createFallbackFunnelContext, getRecommendedOffer } from '@/lib/funnel/catalog';
import { previewAmountDueToday } from '@/lib/funnel/local-last-offer';

describe('previewAmountDueToday', () => {
  it('turns the recommended VN 12-week welcome price into 99.000d for the 75% local offer', () => {
    const context = createFallbackFunnelContext('VN');
    const recommended = getRecommendedOffer(context.offers);

    expect(previewAmountDueToday(recommended, 75)).toBe(99_000);
  });

  it('keeps non-recommended VN plans at their welcome price after the 75% local offer', () => {
    const context = createFallbackFunnelContext('VN');
    const fourWeek = context.offers.find((offer) => offer.label === '4 tuần');

    expect(fourWeek).toBeDefined();
    expect(previewAmountDueToday(fourWeek!, 75)).toBe(99_000);
  });
});
