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
    trackEvent('funnel_step_viewed', { step: 'email_capture' });
    const w = window as unknown as {
      gtag: ReturnType<typeof vi.fn>;
      fbq: ReturnType<typeof vi.fn>;
      ttq: { track: ReturnType<typeof vi.fn> };
    };
    expect(w.gtag).toHaveBeenCalledWith('event', 'funnel_step_viewed', { step: 'email_capture' });
    expect(w.ttq.track).toHaveBeenCalledWith('funnel_step_viewed', { step: 'email_capture' });
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

  it('sends the paywall view and plan selection to TikTok as standard events', () => {
    trackStepViewed('paywall');
    trackEvent('offer_selected', { offer_id: 'vn_monthly_welcome50', provider: 'revenuecat' });
    const w = window as unknown as { ttq: { track: ReturnType<typeof vi.fn> } };
    expect(w.ttq.track).toHaveBeenCalledWith('ViewContent', { content_type: 'product' });
    expect(w.ttq.track).toHaveBeenCalledWith('AddToCart', {
      content_type: 'product',
      quantity: 1,
      content_ids: ['vn_monthly_welcome50'],
    });
  });

  it('sends checkout start and completion to TikTok with value, currency and plan', () => {
    trackEvent('revenuecat_checkout_started', { plan: '12-week', value: 249000, currency: 'VND' });
    trackEvent('revenuecat_checkout_completed', { plan: '12-week', value: 249000, currency: 'VND' });
    const w = window as unknown as { ttq: { track: ReturnType<typeof vi.fn> } };
    const commerce = {
      content_type: 'product',
      quantity: 1,
      content_ids: ['12-week'],
      value: 249000,
      currency: 'VND',
    };
    expect(w.ttq.track).toHaveBeenCalledWith('InitiateCheckout', commerce);
    expect(w.ttq.track).toHaveBeenCalledWith('Purchase', commerce);
  });

  it('sends AddToCart once per plan however often it is clicked', () => {
    trackEvent('offer_selected', { offer_id: 'vn_monthly_welcome50', provider: 'revenuecat' });
    trackEvent('offer_selected', { offer_id: 'vn_monthly_welcome50', provider: 'revenuecat' });
    trackEvent('offer_selected', { offer_id: 'vn_semiannual_welcome50', provider: 'revenuecat' });
    trackEvent('offer_selected', { offer_id: 'vn_monthly_welcome50', provider: 'revenuecat' });
    const w = window as unknown as { ttq: { track: ReturnType<typeof vi.fn> } };
    const addToCart = w.ttq.track.mock.calls.filter(([event]) => event === 'AddToCart');
    expect(addToCart.map(([, params]) => params.content_ids)).toEqual([
      ['vn_monthly_welcome50'],
      ['vn_semiannual_welcome50'],
    ]);
  });

  it('sends AddToCart at checkout when the preselected plan was kept', () => {
    trackStepViewed('paywall');
    trackEvent('revenuecat_checkout_started', { plan: '12-week', value: 249000, currency: 'VND' });
    const w = window as unknown as { ttq: { track: ReturnType<typeof vi.fn> } };
    expect(w.ttq.track.mock.calls.map(([event]) => event)).toEqual([
      'funnel_step_viewed',
      'ViewContent',
      'revenuecat_checkout_started',
      'AddToCart',
      'InitiateCheckout',
    ]);
    expect(w.ttq.track).toHaveBeenCalledWith('AddToCart', {
      value: 249000,
      currency: 'VND',
      content_type: 'product',
      quantity: 1,
      content_ids: ['12-week'],
    });
  });

  it('does not repeat AddToCart at checkout for a plan already in the cart', () => {
    trackEvent('offer_selected', { offer_id: '12-week', provider: 'revenuecat' });
    trackEvent('revenuecat_checkout_started', { plan: '12-week', value: 249000, currency: 'VND' });
    trackEvent('revenuecat_checkout_started', { plan: '12-week', value: 62250, currency: 'VND' });
    const w = window as unknown as { ttq: { track: ReturnType<typeof vi.fn> } };
    const events = w.ttq.track.mock.calls.map(([event]) => event);
    expect(events.filter((event) => event === 'AddToCart')).toHaveLength(1);
    expect(events.filter((event) => event === 'InitiateCheckout')).toHaveLength(2);
  });

  it('keeps quiz screens off TikTok but on GA4', () => {
    trackStepViewed('height');
    trackStepViewed('target_weight');
    const w = window as unknown as { gtag: ReturnType<typeof vi.fn>; ttq: { track: ReturnType<typeof vi.fn> } };
    expect(w.gtag).toHaveBeenCalledWith('event', 'funnel_step_viewed', { step: 'target_weight' });
    expect(w.ttq.track).not.toHaveBeenCalled();
  });
});
