import { afterEach, describe, expect, it, vi } from 'vitest';
import { analyticsLocale, carriesStoredFunnelLocale, FUNNEL_LOCALE_STORAGE_KEY, funnelLocaleFromPath, funnelName, isFunnelLocale, readLockedFunnelLocale, readRememberedFunnelLocale, surveyLocaleFromPath } from './funnel-locale';

describe('funnel locale', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('treats only the english survey as english', () => {
    expect(funnelLocaleFromPath('/survey/en')).toBe('en');
    expect(funnelLocaleFromPath('/survey/en/')).toBe('en');
    expect(funnelLocaleFromPath('/survey/vi')).toBe('vi');
    expect(funnelLocaleFromPath('/')).toBe('vi');
    expect(funnelLocaleFromPath('/postcheckout')).toBe('vi');
    expect(funnelLocaleFromPath('/survey/envi')).toBe('vi');
    expect(funnelLocaleFromPath(null)).toBe('vi');
    expect(surveyLocaleFromPath('/paywall')).toBeNull();
  });

  it('accepts only the two funnel locales', () => {
    expect(isFunnelLocale('en')).toBe(true);
    expect(isFunnelLocale('vi')).toBe(true);
    expect(isFunnelLocale('EN')).toBe(false);
    expect(isFunnelLocale('9999999999')).toBe(false);
    expect(funnelName('en')).toBe('web_funnel_en');
    expect(funnelName('vi')).toBe('web_funnel_vi');
  });

  it('keeps the loaded locale after leaving the survey and lets the survey path win', () => {
    vi.stubGlobal('document', {
      documentElement: { getAttribute: () => 'en' },
    });
    expect(readLockedFunnelLocale()).toBe('en');
    expect(analyticsLocale('/postcheckout')).toBe('en');
    expect(analyticsLocale('/survey/vi')).toBe('vi');
    expect(analyticsLocale('/survey/en')).toBe('en');
    expect(analyticsLocale('/')).toBe('vi');
    expect(carriesStoredFunnelLocale('/postcheckout')).toBe(true);
    expect(carriesStoredFunnelLocale('/welcome-gift')).toBe(false);
  });

  it('keeps a remembered english locale when the reloaded document is vietnamese', () => {
    const storage = new Map<string, string>([[FUNNEL_LOCALE_STORAGE_KEY, 'en']]);
    vi.stubGlobal('sessionStorage', {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => { storage.set(key, value); },
    });
    vi.stubGlobal('document', {
      documentElement: { getAttribute: () => 'vi' },
    });
    expect(readRememberedFunnelLocale()).toBe('en');
    expect(analyticsLocale('/postcheckout')).toBe('en');
    expect(analyticsLocale('/success', 'vi')).toBe('en');
    expect(analyticsLocale('/', 'en')).toBe('vi');
    expect(analyticsLocale('/paywall', 'en')).toBe('vi');
    expect(analyticsLocale('/survey/vi')).toBe('vi');
  });

  it('keeps an already registered english super property ahead of the document default', () => {
    vi.stubGlobal('document', {
      documentElement: { getAttribute: () => 'vi' },
    });
    expect(analyticsLocale('/postcheckout', 'en')).toBe('en');
    expect(analyticsLocale('/welcome', 'vi')).toBe('vi');
    expect(analyticsLocale('/welcome', 'fr')).toBe('vi');
    expect(analyticsLocale('/', 'en')).toBe('vi');
    expect(analyticsLocale('/exit-offer', 'en')).toBe('vi');
  });
});
