import { beforeEach, describe, expect, it, vi } from 'vitest';

const { capture, identify, register, getProperty } = vi.hoisted(() => ({
  capture: vi.fn(),
  identify: vi.fn(),
  register: vi.fn(),
  getProperty: vi.fn(),
}));

vi.mock('posthog-js', () => ({
  default: { capture, identify, register, get_property: getProperty },
}));

import { captureFunnelEvent, identifyFunnelLead, registerDocumentFunnelLocale, registerFunnelSuperProperties } from './posthog';

describe('captureFunnelEvent', () => {
  beforeEach(() => {
    capture.mockClear();
  });

  it('sends the funnel event to PostHog', () => {
    captureFunnelEvent('revenuecat_checkout_started', { plan: '24-week' });
    expect(capture).toHaveBeenCalledWith('revenuecat_checkout_started', { plan: '24-week' });
  });
});

describe('identifyFunnelLead', () => {
  beforeEach(() => {
    identify.mockClear();
  });

  it('identifies the lead and keeps the email on the person', () => {
    identifyFunnelLead('lead-1', 'ada@example.com');
    expect(identify).toHaveBeenCalledWith('lead-1', { source: 'web_funnel', email: 'ada@example.com' });
  });

  it('skips an empty lead id', () => {
    identifyFunnelLead('', 'ada@example.com');
    expect(identify).not.toHaveBeenCalled();
  });
});

describe('registerDocumentFunnelLocale', () => {
  beforeEach(() => {
    register.mockClear();
    getProperty.mockReset();
  });

  it('re-registers the stored english locale instead of the reloaded document', () => {
    getProperty.mockReturnValue('en');
    vi.stubGlobal('document', {
      documentElement: { getAttribute: () => 'vi' },
    });
    expect(registerDocumentFunnelLocale('/postcheckout')).toBe('en');
    expect(register).toHaveBeenCalledWith({ funnel_locale: 'en', funnel: 'web_funnel_en' });
    register.mockClear();
    expect(registerDocumentFunnelLocale('/')).toBe('vi');
    expect(register).toHaveBeenCalledWith({ funnel_locale: 'vi', funnel: 'web_funnel_vi' });
    vi.unstubAllGlobals();
  });
});

describe('registerFunnelSuperProperties', () => {
  beforeEach(() => {
    register.mockClear();
  });

  it('sets the locale and funnel name on every later event', () => {
    registerFunnelSuperProperties('en');
    registerFunnelSuperProperties('vi');
    expect(register).toHaveBeenNthCalledWith(1, { funnel_locale: 'en', funnel: 'web_funnel_en' });
    expect(register).toHaveBeenNthCalledWith(2, { funnel_locale: 'vi', funnel: 'web_funnel_vi' });
  });
});
