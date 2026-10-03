import { describe, expect, it } from 'vitest';
import { appStoreUrl, orderedStoreLinks, phoneStoreFromUserAgent, playStoreUrl } from './store-links';

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

  it('leads with the store that matches the phone', () => {
    expect(phoneStoreFromUserAgent('Mozilla/5.0 (Linux; Android 14)')).toBe('android');
    expect(phoneStoreFromUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)')).toBe('ios');
    expect(phoneStoreFromUserAgent('Mozilla/5.0 (Macintosh)')).toBeNull();
    expect(orderedStoreLinks('android').map((store) => store.label)).toEqual(['Google Play', 'App Store']);
    expect(orderedStoreLinks('ios').map((store) => [store.label, store.primary])).toEqual([
      ['App Store', true],
      ['Google Play', false],
    ]);
    expect(orderedStoreLinks(null)[0]?.label).toBe('App Store');
  });
});
