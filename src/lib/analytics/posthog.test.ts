import { beforeEach, describe, expect, it, vi } from 'vitest';

const { capture, identify } = vi.hoisted(() => ({ capture: vi.fn(), identify: vi.fn() }));

vi.mock('posthog-js', () => ({
  default: { capture, identify },
}));

import { captureFunnelEvent, identifyFunnelLead } from './posthog';

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
