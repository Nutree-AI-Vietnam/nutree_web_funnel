import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { metaDatasetForLocale } from './meta-dataset';

describe('meta dataset', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_META_PIXEL_ID', '1111111111');
    vi.stubEnv('META_CONVERSIONS_API_ACCESS_TOKEN', 'vi-token');
    vi.stubEnv('META_CONVERSIONS_API_TEST_EVENT_CODE', 'VI_TEST');
    vi.stubEnv('NEXT_PUBLIC_META_PIXEL_ID_EN', '');
    vi.stubEnv('META_CONVERSIONS_API_ACCESS_TOKEN_EN', '');
    vi.stubEnv('META_CONVERSIONS_API_TEST_EVENT_CODE_EN', '');
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('uses the English pixel and token only as a pair', () => {
    vi.stubEnv('NEXT_PUBLIC_META_PIXEL_ID_EN', '2222222222');
    vi.stubEnv('META_CONVERSIONS_API_ACCESS_TOKEN_EN', 'en-token');
    vi.stubEnv('META_CONVERSIONS_API_TEST_EVENT_CODE_EN', 'EN_TEST');
    expect(metaDatasetForLocale('en')).toEqual({
      pixelId: '2222222222',
      accessToken: 'en-token',
      testEventCode: 'EN_TEST',
    });
    expect(metaDatasetForLocale('vi')).toEqual({
      pixelId: '1111111111',
      accessToken: 'vi-token',
      testEventCode: 'VI_TEST',
    });
    expect(console.warn).not.toHaveBeenCalled();
  });

  it('falls back to the Vietnamese pair when the English pixel has no token', () => {
    vi.stubEnv('NEXT_PUBLIC_META_PIXEL_ID_EN', '2222222222');
    expect(metaDatasetForLocale('en')).toEqual({
      pixelId: '1111111111',
      accessToken: 'vi-token',
      testEventCode: 'VI_TEST',
    });
    expect(console.warn).toHaveBeenCalledWith(
      'English Meta pixel and token must both be set; using the Vietnamese dataset.',
      { pixel: 'set', token: 'missing' },
    );
  });

  it('falls back to the Vietnamese pair when the English token has no pixel', () => {
    vi.stubEnv('META_CONVERSIONS_API_ACCESS_TOKEN_EN', 'en-token');
    vi.stubEnv('META_CONVERSIONS_API_TEST_EVENT_CODE_EN', 'EN_TEST');
    expect(metaDatasetForLocale('en')).toEqual({
      pixelId: '1111111111',
      accessToken: 'vi-token',
      testEventCode: 'VI_TEST',
    });
    const logged = JSON.stringify((console.warn as ReturnType<typeof vi.fn>).mock.calls);
    expect(logged).not.toContain('en-token');
    expect(console.warn).toHaveBeenCalledWith(
      'English Meta pixel and token must both be set; using the Vietnamese dataset.',
      { pixel: 'missing', token: 'set' },
    );
  });

  it('falls back quietly when the English dataset is unset', () => {
    expect(metaDatasetForLocale('en')).toEqual({
      pixelId: '1111111111',
      accessToken: 'vi-token',
      testEventCode: 'VI_TEST',
    });
    expect(console.warn).not.toHaveBeenCalled();
  });
});
