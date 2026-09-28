import { describe, it, expect, vi, beforeEach } from 'vitest';
import { trackEvent, trackStepViewed } from './track';

describe('analytics', () => {
  beforeEach(() => {
    const store = new Map<string, string>();
    vi.stubGlobal('crypto', { randomUUID: () => 'test-event-id' });
    vi.stubGlobal('window', {
      gtag: vi.fn(),
      fbq: vi.fn(),
      ttq: { track: vi.fn() },
      sessionStorage: {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => {
          store.set(key, value);
        },
      },
    });
  });

  it('fans out custom funnel events to gtag and TikTok only', () => {
    trackEvent('funnel_step_viewed', { step: 'goal' });
    const w = window as unknown as {
      gtag: ReturnType<typeof vi.fn>;
      fbq: ReturnType<typeof vi.fn>;
      ttq: { track: ReturnType<typeof vi.fn> };
    };
    expect(w.gtag).toHaveBeenCalledWith('event', 'funnel_step_viewed', { step: 'goal' });
    expect(w.ttq.track).toHaveBeenCalledWith('funnel_step_viewed', { step: 'goal' });
    expect(w.fbq).not.toHaveBeenCalled();
  });

  it('maps checkout events to Meta standard conversions with eventID', () => {
    trackEvent('email_captured', {});
    trackEvent('revenuecat_checkout_started', { plan: '12-week', value: 249000, currency: 'VND' });
    trackEvent('revenuecat_checkout_completed', { plan: '12-week', value: 249000, currency: 'VND' });
    const w = window as unknown as { fbq: ReturnType<typeof vi.fn> };
    expect(w.fbq).toHaveBeenCalledWith('track', 'Lead', { content_name: 'email_capture' }, { eventID: 'Lead.test-event-id' });
    expect(w.fbq).toHaveBeenCalledWith('track', 'InitiateCheckout', {
      value: 249000,
      currency: 'VND',
      content_type: 'product',
      num_items: 1,
      content_ids: ['12-week'],
      content_name: '12-week',
      contents: [{ id: '12-week', quantity: 1 }],
    }, { eventID: 'InitiateCheckout.test-event-id' });
    expect(w.fbq).toHaveBeenCalledWith('track', 'Purchase', {
      value: 249000,
      currency: 'VND',
      content_type: 'product',
      num_items: 1,
      content_ids: ['12-week'],
      content_name: '12-week',
      contents: [{ id: '12-week', quantity: 1 }],
    }, { eventID: 'Purchase.test-event-id' });
    expect(w.fbq).not.toHaveBeenCalledWith('trackCustom', expect.anything(), expect.anything());
  });

  it('fires ViewContent once on the funnel landing step', () => {
    trackStepViewed('landing');
    const w = window as unknown as { fbq: ReturnType<typeof vi.fn> };
    expect(w.fbq).toHaveBeenCalledWith('track', 'ViewContent', {
      content_name: 'funnel_landing',
      content_category: 'onboarding',
    }, { eventID: 'ViewContent.test-event-id' });
  });

  it('trackStepViewed sends the step slug', () => {
    trackStepViewed('height');
    const w = window as unknown as { gtag: ReturnType<typeof vi.fn>; fbq: ReturnType<typeof vi.fn> };
    expect(w.gtag).toHaveBeenCalledWith('event', 'funnel_step_viewed', {
      step: 'height',
    });
    expect(w.fbq).not.toHaveBeenCalled();
  });

  it('does not throw when pixels are absent', () => {
    vi.stubGlobal('window', {});
    expect(() => trackEvent('x', {})).not.toThrow();
  });
});
