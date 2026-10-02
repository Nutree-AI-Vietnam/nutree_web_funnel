import { describe, expect, it } from 'vitest';
import { appStoreUrl, playStoreUrl } from './store-links';

describe('store links', () => {
  it('keeps a real production store URL', () => {
    expect(appStoreUrl('https://apps.apple.com/app/id6751159552')).toBe(
      'https://apps.apple.com/app/id6751159552',
    );
    expect(playStoreUrl('https://play.google.com/store/apps/details?id=com.nutreeai.mobile')).toBe(
      'https://play.google.com/store/apps/details?id=com.nutreeai.mobile',
    );
  });

  it('replaces placeholders and staging Play links with the production listing', () => {
    expect(playStoreUrl('<Firebase Android package ID>')).toBe(
      'https://play.google.com/store/apps/details?id=com.nutreeai.mobile',
    );
    expect(playStoreUrl('https://play.google.com/store/apps/details?id=com.nutreeai.mobile.staging')).toBe(
      'https://play.google.com/store/apps/details?id=com.nutreeai.mobile',
    );
    expect(
      playStoreUrl(
        'https://play.google.com/store/apps/details?id=<Firebase Android package ID>',
      ),
    ).toBe('https://play.google.com/store/apps/details?id=com.nutreeai.mobile');
    expect(appStoreUrl('')).toBe('https://apps.apple.com/app/id6751159552');
  });
});
