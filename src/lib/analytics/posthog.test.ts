import { beforeEach, describe, expect, it, vi } from 'vitest';

const { capture, identify } = vi.hoisted(() => ({ capture: vi.fn(), identify: vi.fn() }));

vi.mock('posthog-js', () => ({
  default: { capture, identify },
}));

import { captureFunnelEvent, captureWebPage, identifyFunnelLead } from './posthog';

describe('captureFunnelEvent', () => {
  beforeEach(() => {
    capture.mockClear();
  });

  it('sends the funnel event to PostHog', () => {
    captureFunnelEvent('revenuecat_checkout_started', { plan: '24-week' });
    expect(capture).toHaveBeenCalledWith('revenuecat_checkout_started', { plan: '24-week' });
  });

  it('records a screen as a page view on the web analytics path', () => {
    vi.stubGlobal('window', { location: { origin: 'https://quiz.nutreeai.com' } });
    captureWebPage('/survey/vi/paywall', 'view');
    expect(capture).toHaveBeenCalledWith('$pageview', {
      $current_url: 'https://quiz.nutreeai.com/survey/vi/paywall',
      $pathname: '/survey/vi/paywall',
    });
    vi.unstubAllGlobals();
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
