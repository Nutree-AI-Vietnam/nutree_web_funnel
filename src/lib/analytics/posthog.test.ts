import { beforeEach, describe, expect, it, vi } from 'vitest';

const { identify } = vi.hoisted(() => ({ identify: vi.fn() }));

vi.mock('posthog-js', () => ({
  default: { identify },
}));

import { identifyFunnelLead } from './posthog';

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
