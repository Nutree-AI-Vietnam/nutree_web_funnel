import { describe, expect, it, vi } from 'vitest';
import { revenueCatAttributionAttributes, syncRevenueCatAttribution } from './attribution-attributes';

describe('revenueCatAttributionAttributes', () => {
  it('maps UTMs onto reserved attributes and keeps the raw values', () => {
    expect(
      revenueCatAttributionAttributes({
        utm_source: 'nutree_website',
        utm_medium: 'owned',
        utm_campaign: 'launch',
        utm_content: 'home_hero',
        utm_term: 'meal plan',
        fbclid: 'fb.1',
        gclid: 'g1',
      }),
    ).toEqual({
      $mediaSource: 'nutree_website',
      $campaign: 'launch',
      $ad: 'home_hero',
      $keyword: 'meal plan',
      utm_source: 'nutree_website',
      utm_medium: 'owned',
      utm_campaign: 'launch',
      utm_content: 'home_hero',
      utm_term: 'meal plan',
      fbclid: 'fb.1',
      gclid: 'g1',
    });
  });

  it('returns nothing for an empty attribution', () => {
    expect(revenueCatAttributionAttributes({})).toEqual({});
  });
});

describe('syncRevenueCatAttribution', () => {
  it('sets attributes on the customer', async () => {
    const setAttributes = vi.fn().mockResolvedValue(undefined);
    await expect(syncRevenueCatAttribution({ setAttributes }, { utm_source: 'nutree_website' })).resolves.toBe(true);
    expect(setAttributes).toHaveBeenCalledWith({ $mediaSource: 'nutree_website', utm_source: 'nutree_website' });
  });

  it('skips the request when there is nothing to attribute', async () => {
    const setAttributes = vi.fn();
    await expect(syncRevenueCatAttribution({ setAttributes }, {})).resolves.toBe(false);
    expect(setAttributes).not.toHaveBeenCalled();
  });

  it('swallows SDK failures', async () => {
    const setAttributes = vi.fn().mockRejectedValue(new Error('network'));
    await expect(syncRevenueCatAttribution({ setAttributes }, { utm_source: 'x' })).resolves.toBe(false);
  });
});
