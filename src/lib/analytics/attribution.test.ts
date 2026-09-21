import { beforeEach, describe, expect, it, vi } from 'vitest';
import { captureAttribution, getAttribution } from './attribution';

describe('attribution', () => {
  beforeEach(() => {
    const store = new Map<string, string>();
    vi.stubGlobal('window', {
      sessionStorage: {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => {
          store.set(key, value);
        },
      },
      location: { search: '' },
    });
  });

  it('captures UTMs and fbclid from the URL', () => {
    const attribution = captureAttribution(
      '?utm_source=facebook&utm_medium=paid&utm_campaign=cut_v1&fbclid=abc.123',
    );
    expect(attribution).toEqual({
      utm_source: 'facebook',
      utm_medium: 'paid',
      utm_campaign: 'cut_v1',
      fbclid: 'abc.123',
    });
    expect(getAttribution()).toEqual(attribution);
  });

  it('keeps first-touch UTMs and refreshes fbclid', () => {
    captureAttribution('?utm_source=facebook&utm_campaign=first&fbclid=one');
    const second = captureAttribution('?utm_source=tiktok&utm_campaign=second&fbclid=two');
    expect(second).toEqual({
      utm_source: 'facebook',
      utm_campaign: 'first',
      fbclid: 'two',
    });
  });
});
