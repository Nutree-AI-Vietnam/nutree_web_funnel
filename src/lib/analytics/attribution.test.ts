import { beforeEach, describe, expect, it, vi } from 'vitest';
import { captureAttribution, getAttribution, stripNonAttributionParams } from './attribution';

function stubWindow(location: { search: string; pathname?: string; hash?: string }) {
  const store = new Map<string, string>();
  const replaceState = vi.fn();
  vi.stubGlobal('window', {
    sessionStorage: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
    },
    location: { pathname: '/survey/en', hash: '', ...location },
    history: { state: { idx: 1 }, replaceState },
  });
  return { replaceState };
}

describe('attribution', () => {
  beforeEach(() => {
    stubWindow({ search: '' });
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

  it('captures an owned-channel website link', () => {
    expect(captureAttribution('?utm_source=nutree_website&utm_medium=owned&utm_content=home_hero')).toEqual({
      utm_source: 'nutree_website',
      utm_medium: 'owned',
      utm_content: 'home_hero',
    });
  });

  it('captures utm_id and ad-platform click IDs', () => {
    expect(captureAttribution('?utm_id=cmp_1&gclid=g1&gbraid=gb1&wbraid=wb1&ttclid=t1')).toEqual({
      utm_id: 'cmp_1',
      gclid: 'g1',
      gbraid: 'gb1',
      wbraid: 'wb1',
      ttclid: 't1',
    });
  });

  it('keeps first-touch UTMs and refreshes click IDs', () => {
    captureAttribution('?utm_source=facebook&utm_campaign=first&fbclid=one&gclid=g1');
    const second = captureAttribution('?utm_source=tiktok&utm_campaign=second&fbclid=two&ttclid=t2');
    expect(second).toEqual({
      utm_source: 'facebook',
      utm_campaign: 'first',
      fbclid: 'two',
      gclid: 'g1',
      ttclid: 't2',
    });
  });

  it('reads the current URL by default', () => {
    stubWindow({ search: '?utm_source=nutree_website&utm_medium=owned' });
    expect(captureAttribution()).toEqual({ utm_source: 'nutree_website', utm_medium: 'owned' });
  });
});

describe('stripNonAttributionParams', () => {
  it('keeps attribution parameters and removes the rest', () => {
    const { replaceState } = stubWindow({
      search: '?utm_source=nutree_website&foo=1&utm_content=home_hero&fbclid=abc&bar=2',
      hash: '#top',
    });
    stripNonAttributionParams();
    expect(replaceState).toHaveBeenCalledWith(
      { idx: 1 },
      '',
      '/survey/en?utm_source=nutree_website&utm_content=home_hero&fbclid=abc#top',
    );
  });

  it('removes the query string entirely when nothing attributable remains', () => {
    const { replaceState } = stubWindow({ search: '?foo=1', pathname: '/survey/vi' });
    stripNonAttributionParams();
    expect(replaceState).toHaveBeenCalledWith({ idx: 1 }, '', '/survey/vi');
  });

  it('leaves the URL untouched when only attribution parameters are present', () => {
    const { replaceState } = stubWindow({ search: '?utm_source=nutree_website&utm_medium=owned' });
    stripNonAttributionParams();
    expect(replaceState).not.toHaveBeenCalled();
  });

  it('does nothing without a query string', () => {
    const { replaceState } = stubWindow({ search: '' });
    stripNonAttributionParams();
    expect(replaceState).not.toHaveBeenCalled();
  });
});
