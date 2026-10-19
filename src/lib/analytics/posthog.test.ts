import { beforeEach, describe, expect, it, vi } from 'vitest';

const { capture, identify, register } = vi.hoisted(() => ({ capture: vi.fn(), identify: vi.fn(), register: vi.fn() }));

vi.mock('posthog-js', () => ({
  default: { capture, identify, register },
}));

import { captureFunnelEvent, identifyFunnelLead, registerFunnelSuperProperties } from './posthog';

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
