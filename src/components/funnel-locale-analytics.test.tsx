/** @vitest-environment jsdom */

import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FunnelLocaleAnalytics } from './funnel-locale-analytics';

const path = vi.hoisted(() => ({ current: '/survey/en' }));
const { register, getProperty } = vi.hoisted(() => ({ register: vi.fn(), getProperty: vi.fn() }));

vi.mock('next/navigation', () => ({
  usePathname: () => path.current,
}));

vi.mock('posthog-js', () => ({
  default: { register, capture: vi.fn(), identify: vi.fn(), get_property: getProperty },
}));

describe('FunnelLocaleAnalytics', () => {
  afterEach(() => {
    cleanup();
    register.mockClear();
    getProperty.mockReset();
    sessionStorage.clear();
    document.documentElement.removeAttribute('data-funnel-locale');
    document.documentElement.lang = 'vi';
  });

  it('sets the english funnel super properties', () => {
    path.current = '/survey/en';
    render(<FunnelLocaleAnalytics />);
    expect(register).toHaveBeenCalledWith({ funnel_locale: 'en', funnel: 'web_funnel_en' });
    expect(document.documentElement.lang).toBe('en');
  });

  it('sets the vietnamese funnel super properties', () => {
    path.current = '/survey/vi';
    render(<FunnelLocaleAnalytics />);
    expect(register).toHaveBeenCalledWith({ funnel_locale: 'vi', funnel: 'web_funnel_vi' });
  });

  it('keeps the loaded english locale on later routes', () => {
    document.documentElement.setAttribute('data-funnel-locale', 'en');
    path.current = '/postcheckout';
    render(<FunnelLocaleAnalytics />);
    expect(register).toHaveBeenCalledWith({ funnel_locale: 'en', funnel: 'web_funnel_en' });
  });

  it('does not replace a remembered english locale after a full reload onto the vietnamese document', () => {
    sessionStorage.setItem('nutree_funnel_locale_v1', 'en');
    document.documentElement.setAttribute('data-funnel-locale', 'vi');
    path.current = '/postcheckout';
    render(<FunnelLocaleAnalytics />);
    expect(register).toHaveBeenCalledWith({ funnel_locale: 'en', funnel: 'web_funnel_en' });
    expect(document.documentElement.lang).toBe('en');
  });

  it('does not replace an english super property on the post-purchase pages', () => {
    getProperty.mockReturnValue('en');
    document.documentElement.setAttribute('data-funnel-locale', 'vi');
    path.current = '/postcheckout';
    render(<FunnelLocaleAnalytics />);
    expect(register).toHaveBeenCalledWith({ funnel_locale: 'en', funnel: 'web_funnel_en' });
    expect(document.documentElement.lang).toBe('en');
  });

  it('forces vietnamese on the home page after an english session', () => {
    sessionStorage.setItem('nutree_funnel_locale_v1', 'en');
    getProperty.mockReturnValue('en');
    document.documentElement.setAttribute('data-funnel-locale', 'vi');
    path.current = '/';
    render(<FunnelLocaleAnalytics />);
    expect(register).toHaveBeenCalledWith({ funnel_locale: 'vi', funnel: 'web_funnel_vi' });
    expect(document.documentElement.lang).toBe('vi');
    expect(sessionStorage.getItem('nutree_funnel_locale_v1')).toBe('en');
  });
});
