import { describe, it, expect, vi, beforeEach } from 'vitest';
import { trackEvent, trackStepViewed } from './track';

describe('analytics', () => {
  beforeEach(() => {
    vi.stubGlobal('window', {
      gtag: vi.fn(),
      fbq: vi.fn(),
      ttq: { track: vi.fn() },
    });
  });

  it('fans out events to gtag, fbq, ttq', () => {
    trackEvent('funnel_step_viewed', { step: 'goal' });
    const w = window as unknown as {
      gtag: ReturnType<typeof vi.fn>;
      fbq: ReturnType<typeof vi.fn>;
      ttq: { track: ReturnType<typeof vi.fn> };
    };
    expect(w.gtag).toHaveBeenCalledWith('event', 'funnel_step_viewed', { step: 'goal' });
    expect(w.fbq).toHaveBeenCalledWith('trackCustom', 'funnel_step_viewed', { step: 'goal' });
    expect(w.ttq.track).toHaveBeenCalledWith('funnel_step_viewed', { step: 'goal' });
  });

  it('trackStepViewed sends the step slug', () => {
    trackStepViewed('height');
    const w = window as unknown as { gtag: ReturnType<typeof vi.fn> };
    expect(w.gtag).toHaveBeenCalledWith('event', 'funnel_step_viewed', {
      step: 'height',
    });
  });

  it('does not throw when pixels are absent', () => {
    vi.stubGlobal('window', {});
    expect(() => trackEvent('x', {})).not.toThrow();
  });
});
