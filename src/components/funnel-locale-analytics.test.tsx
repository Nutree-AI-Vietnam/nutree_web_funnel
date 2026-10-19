/** @vitest-environment jsdom */

import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FunnelLocaleAnalytics } from './funnel-locale-analytics';

const path = vi.hoisted(() => ({ current: '/survey/en' }));
const { register } = vi.hoisted(() => ({ register: vi.fn() }));

vi.mock('next/navigation', () => ({
  usePathname: () => path.current,
}));

vi.mock('posthog-js', () => ({
  default: { register, capture: vi.fn(), identify: vi.fn() },
}));

describe('FunnelLocaleAnalytics', () => {
  afterEach(() => {
    cleanup();
    register.mockClear();
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
});
