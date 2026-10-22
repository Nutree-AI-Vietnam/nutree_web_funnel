import { createHash, webcrypto } from 'node:crypto';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { META_IDENTITY_STORAGE_KEY } from './meta-identity';
import { trackEvent, trackStepViewed } from './track';
import { TIKTOK_IDENTITY_STORAGE_KEY } from './tiktok-identity';

const emailHash = 'a'.repeat(64);
const leadHash = 'b'.repeat(64);
const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');
const planProduct = {
  content_type: 'product',
  num_items: 1,
  content_ids: ['12-week'],
  content_name: '12-week',
  contents: [{ id: '12-week', quantity: 1 }],
};
const planCommerce = { value: 249000, currency: 'VND', ...planProduct };

type TestWindow = {
  gtag: ReturnType<typeof vi.fn>;
  fbq: ReturnType<typeof vi.fn>;
  ttq: { track: ReturnType<typeof vi.fn>; identify?: ReturnType<typeof vi.fn> };
  sessionStorage: Pick<Storage, 'getItem' | 'setItem'>;
  location?: { href?: string; hostname?: string };
};

function serverEvents() {
  return (fetch as ReturnType<typeof vi.fn>).mock.calls.map(([url, init]) => ({ url, init, body: JSON.parse(init.body) }));
}

function metaServerEvents() {
  return serverEvents().filter(({ url }) => url === '/api/meta/events');
}

describe('analytics', () => {
  beforeEach(() => {
    const store = new Map<string, string>();
    vi.stubEnv('NEXT_PUBLIC_TIKTOK_PIXEL_ID', '');
    vi.stubEnv('NEXT_PUBLIC_META_PIXEL_ID', '');
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(new Response(null, { status: 204 }))));
    vi.stubGlobal('crypto', { randomUUID: () => 'test-event-id' });
    vi.stubGlobal('window', {
      gtag: vi.fn(),
      fbq: vi.fn(),
      ttq: { track: vi.fn() },
      location: { hostname: 'quiz.nutreeai.com' },
      sessionStorage: {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => {
          store.set(key, value);
        },
      },
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
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

  it('copies Meta standard events to the server with the pixel eventID and hashed identity', async () => {
    vi.stubEnv('NEXT_PUBLIC_META_PIXEL_ID', '1234567890');
    vi.stubGlobal('crypto', { randomUUID: () => 'test-event-id', subtle: webcrypto.subtle });
    vi.spyOn(Date, 'now').mockReturnValue(1_760_000_000_000);
    const w = window as unknown as TestWindow;
    w.location = { hostname: 'quiz.nutreeai.com', href: 'https://quiz.test/paywall?fbclid=IwAR-click#plan' };
    w.sessionStorage.setItem(META_IDENTITY_STORAGE_KEY, JSON.stringify({ em: 'jane@example.com', external_id: 'lead-1', fn: 'jane' }));
    trackEvent('revenuecat_checkout_completed', { plan: '12-week', value: 249000, currency: 'VND', fbclid: 'IwAR-click' });
    expect(w.fbq).toHaveBeenCalledWith('track', 'Purchase', planCommerce, { eventID: 'Purchase.test-event-id' });
    await vi.waitFor(() => expect(metaServerEvents()).toHaveLength(1));
    const [sent] = metaServerEvents();
    expect(sent.init).toMatchObject({ method: 'POST', keepalive: true });
    expect(sent.body).toEqual({
      event_name: 'Purchase',
      event_id: 'Purchase.test-event-id',
      event_source_url: 'https://quiz.test/paywall',
      locale: 'vi',
      custom_data: planCommerce,
      user_data: {
        em: sha256('jane@example.com'),
        external_id: sha256('lead-1'),
        fn: sha256('jane'),
        fbc: 'fb.1.1760000000000.IwAR-click',
      },
    });
  });

  it.each(['quiz.preview.nutreeai.com', 'nutreewebfunnel-git-branch.vercel.app', 'localhost'])('sends no Meta or TikTok server copy from %s', async (hostname) => {
    vi.stubEnv('NEXT_PUBLIC_META_PIXEL_ID', '1234567890');
    vi.stubEnv('NEXT_PUBLIC_TIKTOK_PIXEL_ID', 'TT123');
    const w = window as unknown as TestWindow;
    w.location = { hostname, href: `https://${hostname}/paywall` };
    trackEvent('email_captured', {});
    trackEvent('revenuecat_checkout_completed', { plan: '12-week', value: 249000, currency: 'VND' });
    await Promise.resolve();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('sends the english locale with the same event id and no pixel id', async () => {
    vi.stubEnv('NEXT_PUBLIC_META_PIXEL_ID', '');
    vi.stubEnv('NEXT_PUBLIC_META_PIXEL_ID_EN', '2222222222');
    vi.stubGlobal('document', {
      documentElement: { getAttribute: () => 'en' },
    });
    trackEvent('email_captured', {});
    await vi.waitFor(() => expect(metaServerEvents()).toHaveLength(1));
    expect(metaServerEvents()[0].body).toMatchObject({
      event_name: 'Lead',
      event_id: 'Lead.test-event-id',
      locale: 'en',
    });
    expect(metaServerEvents()[0].body.pixel_id).toBeUndefined();
  });

  it('dates fbc by when the tab first saw the click', async () => {
    vi.stubEnv('NEXT_PUBLIC_META_PIXEL_ID', '1234567890');
    const now = vi.spyOn(Date, 'now');
    const w = window as unknown as TestWindow;
    w.sessionStorage.setItem('nutree_attribution_v1', JSON.stringify({ fbclid: 'click-1' }));
    now.mockReturnValue(1_760_000_000_000);
    trackStepViewed('landing');
    now.mockReturnValue(1_760_000_600_000);
    trackEvent('email_captured', {});
    w.sessionStorage.setItem('nutree_attribution_v1', JSON.stringify({ fbclid: 'click-2' }));
    now.mockReturnValue(1_760_001_200_000);
    trackEvent('revenuecat_checkout_started', { plan: '12-week', value: 249000, currency: 'VND' });
    await vi.waitFor(() => expect(metaServerEvents()).toHaveLength(3));
    expect(metaServerEvents().map(({ body }) => [body.event_name, body.user_data.fbc])).toEqual([
      ['ViewContent', 'fb.1.1760000000000.click-1'],
      ['Lead', 'fb.1.1760000000000.click-1'],
      ['InitiateCheckout', 'fb.1.1760001200000.click-2'],
    ]);
  });

  it('copies Meta standard events to the server when the pixel is blocked', async () => {
    vi.stubEnv('NEXT_PUBLIC_META_PIXEL_ID', '1234567890');
    vi.stubGlobal('window', { location: { hostname: 'quiz.nutreeai.com' }, sessionStorage: (window as unknown as TestWindow).sessionStorage });
    trackStepViewed('landing');
    await vi.waitFor(() => expect(metaServerEvents().map(({ body }) => body.event_name)).toEqual(['ViewContent']));
  });

  it('sends no Meta server copy without a pixel id or for other events', async () => {
    trackEvent('email_captured', {});
    vi.stubEnv('NEXT_PUBLIC_META_PIXEL_ID', '1234567890');
    trackStepViewed('height');
    trackEvent('offer_selected', { offer_id: '12-week', provider: 'revenuecat', value: 249000, currency: 'VND' });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(fetch).not.toHaveBeenCalled();
  });

  it('drops a value Meta and TikTok would reject, with its currency', () => {
    trackEvent('revenuecat_checkout_completed', { plan: '12-week', value: 0, currency: 'VND' });
    trackEvent('revenuecat_checkout_completed', { plan: '12-week', value: 249000 });
    trackEvent('revenuecat_checkout_completed', { plan: '12-week', value: 249000, currency: 'đ' });
    const w = window as unknown as TestWindow;
    expect(w.fbq.mock.calls.map(([, event, params]) => [event, params])).toEqual([
      ['Purchase', planProduct],
      ['Purchase', planProduct],
      ['Purchase', planProduct],
    ]);
    const purchases = w.ttq.track.mock.calls.filter(([event]) => event === 'Purchase');
    expect(purchases.map(([, params]) => params)).toEqual(Array(3).fill({
      content_type: 'product',
      contents: [{ content_id: '12-week', quantity: 1 }],
    }));
  });

  it('fires ViewContent once on the funnel landing step', () => {
    trackStepViewed('landing');
    const w = window as unknown as { fbq: ReturnType<typeof vi.fn> };
    expect(w.fbq).toHaveBeenCalledWith('track', 'ViewContent', {
      content_name: 'funnel_landing',
      content_category: 'onboarding',
    }, { eventID: 'ViewContent.test-event-id' });
  });

  it('fires ViewContent once per session on the goal step, in the browser and on the server', async () => {
    vi.stubEnv('NEXT_PUBLIC_META_PIXEL_ID', '1234567890');
    trackStepViewed('goal');
    trackStepViewed('goal');
    const w = window as unknown as TestWindow;
    expect(w.fbq).toHaveBeenCalledTimes(1);
    expect(w.fbq).toHaveBeenCalledWith('track', 'ViewContent', {
      content_name: 'funnel_quiz_start',
      content_category: 'onboarding',
    }, { eventID: 'ViewContent.test-event-id' });
    expect(w.ttq.track).not.toHaveBeenCalled();
    await vi.waitFor(() => expect(metaServerEvents()).toHaveLength(1));
    expect(metaServerEvents()[0].body).toMatchObject({
      event_name: 'ViewContent',
      event_id: 'ViewContent.test-event-id',
      custom_data: { content_name: 'funnel_quiz_start', content_category: 'onboarding' },
    });
  });

  it('does not send a second ViewContent when landing and goal are both viewed', () => {
    trackStepViewed('landing');
    trackStepViewed('goal');
    const w = window as unknown as { fbq: ReturnType<typeof vi.fn> };
    expect(w.fbq.mock.calls.filter(([, event]) => event === 'ViewContent')).toHaveLength(1);
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
    expect(w.ttq.track).toHaveBeenCalledWith('ViewContent', {
      content_type: 'product_group',
      contents: [{ content_id: 'nutree_premium' }],
    }, { event_id: 'ViewContent.test-event-id' });
    expect(w.ttq.track).toHaveBeenCalledWith('AddToCart', {
      content_type: 'product',
      contents: [{ content_id: 'vn_monthly_welcome50', quantity: 1 }],
    }, { event_id: 'AddToCart.test-event-id' });
  });

  it('sends the plan price with AddToCart', () => {
    trackEvent('offer_selected', { offer_id: 'vn_monthly_welcome50', provider: 'revenuecat', value: 99000, currency: 'VND' });
    const w = window as unknown as TestWindow;
    expect(w.ttq.track).toHaveBeenCalledWith('AddToCart', {
      value: 99000,
      currency: 'VND',
      content_type: 'product',
      contents: [{ content_id: 'vn_monthly_welcome50', quantity: 1, price: 99000 }],
    }, { event_id: 'AddToCart.test-event-id' });
  });

  it('sends CompleteRegistration to TikTok when the email is captured', () => {
    trackEvent('email_captured', {});
    const w = window as unknown as TestWindow;
    expect(w.ttq.track).toHaveBeenCalledWith('CompleteRegistration', {
      content_type: 'product_group',
      contents: [{ content_id: 'nutree_premium' }],
    }, { event_id: 'CompleteRegistration.test-event-id' });
  });

  it('identifies the TikTok pixel with the stored hashes once, before its events', () => {
    const w = window as unknown as TestWindow;
    w.sessionStorage.setItem(TIKTOK_IDENTITY_STORAGE_KEY, JSON.stringify({ email: emailHash, external_id: leadHash }));
    w.ttq.identify = vi.fn();
    trackStepViewed('paywall');
    trackEvent('offer_selected', { offer_id: '12-week', provider: 'revenuecat' });
    expect(w.ttq.identify).toHaveBeenCalledTimes(1);
    expect(w.ttq.identify).toHaveBeenCalledWith({ email: emailHash, external_id: leadHash });
    expect(w.ttq.identify.mock.invocationCallOrder[0]).toBeLessThan(w.ttq.track.mock.invocationCallOrder[0]);
  });

  it('copies TikTok standard events to the server with the pixel event_id', () => {
    vi.stubEnv('NEXT_PUBLIC_TIKTOK_PIXEL_ID', 'PIXEL');
    const w = window as unknown as TestWindow;
    w.location = { hostname: 'quiz.nutreeai.com', href: 'https://quiz.test/paywall?ttclid=click-1#plan' };
    w.sessionStorage.setItem(TIKTOK_IDENTITY_STORAGE_KEY, JSON.stringify({ email: emailHash, external_id: leadHash }));
    trackEvent('revenuecat_checkout_completed', { plan: '12-week', value: 249000, currency: 'VND', ttclid: 'click-1' });
    const properties = {
      value: 249000,
      currency: 'VND',
      content_type: 'product',
      contents: [{ content_id: '12-week', quantity: 1, price: 249000 }],
    };
    expect(w.ttq.track).toHaveBeenCalledWith('Purchase', properties, { event_id: 'Purchase.test-event-id' });
    const [sent] = serverEvents();
    expect(serverEvents()).toHaveLength(1);
    expect(sent.url).toBe('/api/tiktok/events');
    expect(sent.init).toMatchObject({ method: 'POST', keepalive: true });
    expect(sent.body).toEqual({
      event: 'Purchase',
      event_id: 'Purchase.test-event-id',
      properties,
      user: { email: emailHash, external_id: leadHash, ttclid: 'click-1' },
      page: { url: 'https://quiz.test/paywall' },
    });
  });

  it('copies standard events to the server before the pixel has loaded', () => {
    vi.stubEnv('NEXT_PUBLIC_TIKTOK_PIXEL_ID', 'PIXEL');
    vi.stubGlobal('window', { location: { hostname: 'quiz.nutreeai.com' }, sessionStorage: (window as unknown as TestWindow).sessionStorage });
    trackStepViewed('paywall');
    expect(serverEvents().map(({ body }) => body.event)).toEqual(['ViewContent']);
  });

  it('sends no server copy without a TikTok pixel id or for custom and quiz events', () => {
    trackStepViewed('paywall');
    expect(fetch).not.toHaveBeenCalled();
    vi.stubEnv('NEXT_PUBLIC_TIKTOK_PIXEL_ID', 'PIXEL');
    trackStepViewed('height');
    trackEvent('funnel_step_viewed', { step: 'email_capture' });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('sends checkout start and completion to TikTok with value, currency and plan', () => {
    trackEvent('revenuecat_checkout_started', { plan: '12-week', value: 249000, currency: 'VND' });
    trackEvent('revenuecat_checkout_completed', { plan: '12-week', value: 249000, currency: 'VND' });
    const w = window as unknown as { ttq: { track: ReturnType<typeof vi.fn> } };
    const commerce = {
      value: 249000,
      currency: 'VND',
      content_type: 'product',
      contents: [{ content_id: '12-week', quantity: 1, price: 249000 }],
    };
    expect(w.ttq.track).toHaveBeenCalledWith('InitiateCheckout', commerce, { event_id: 'InitiateCheckout.test-event-id' });
    expect(w.ttq.track).toHaveBeenCalledWith('Purchase', commerce, { event_id: 'Purchase.test-event-id' });
  });

  it('reports a paid MoMo pass as a Meta and TikTok Purchase whose event id is fixed by the order', async () => {
    vi.stubEnv('NEXT_PUBLIC_META_PIXEL_ID', '1234567890');
    vi.stubEnv('NEXT_PUBLIC_TIKTOK_PIXEL_ID', 'PIXEL');
    vi.stubGlobal('crypto', { randomUUID: () => 'test-event-id', subtle: webcrypto.subtle });
    const orderId = 'a'.repeat(32);
    const eventId = `Purchase.momo.${orderId}`;
    // A second tab or a reopened return link reports the same order again.
    trackEvent('momo_checkout_completed', { order_id: orderId, plan: 'quarterly', value: 249000, currency: 'VND' });
    trackEvent('momo_checkout_completed', { order_id: orderId, plan: 'quarterly', value: 249000, currency: 'VND' });
    const w = window as unknown as TestWindow;
    const metaParams = {
      value: 249000,
      currency: 'VND',
      content_type: 'product',
      num_items: 1,
      content_ids: ['quarterly'],
      content_name: 'quarterly',
      contents: [{ id: 'quarterly', quantity: 1 }],
    };
    const tiktokParams = {
      value: 249000,
      currency: 'VND',
      content_type: 'product',
      contents: [{ content_id: 'quarterly', quantity: 1, price: 249000 }],
    };
    expect(w.fbq.mock.calls).toEqual([
      ['track', 'Purchase', metaParams, { eventID: eventId }],
      ['track', 'Purchase', metaParams, { eventID: eventId }],
    ]);
    expect(w.ttq.track.mock.calls.filter(([event]) => event === 'Purchase')).toEqual([
      ['Purchase', tiktokParams, { event_id: eventId }],
      ['Purchase', tiktokParams, { event_id: eventId }],
    ]);
    await vi.waitFor(() => expect(metaServerEvents()).toHaveLength(2));
    const serverIds = serverEvents().map(({ url, body }) => [url, body.event_id]);
    expect(serverIds).toHaveLength(4);
    expect(new Set(serverIds.map(([, id]) => id))).toEqual(new Set([eventId]));
  });

  it('keeps random event ids for a MoMo completion without a valid order id', () => {
    trackEvent('momo_checkout_completed', { order_id: '../leads', plan: 'quarterly', value: 249000, currency: 'VND' });
    const w = window as unknown as TestWindow;
    expect(w.fbq).toHaveBeenCalledWith('track', 'Purchase', expect.any(Object), { eventID: 'Purchase.test-event-id' });
    expect(w.ttq.track).toHaveBeenCalledWith('Purchase', expect.any(Object), { event_id: 'Purchase.test-event-id' });
  });

  it('sends AddToCart once per plan however often it is clicked', () => {
    trackEvent('offer_selected', { offer_id: 'vn_monthly_welcome50', provider: 'revenuecat' });
    trackEvent('offer_selected', { offer_id: 'vn_monthly_welcome50', provider: 'revenuecat' });
    trackEvent('offer_selected', { offer_id: 'vn_semiannual_welcome50', provider: 'revenuecat' });
    trackEvent('offer_selected', { offer_id: 'vn_monthly_welcome50', provider: 'revenuecat' });
    const w = window as unknown as { ttq: { track: ReturnType<typeof vi.fn> } };
    const addToCart = w.ttq.track.mock.calls.filter(([event]) => event === 'AddToCart');
    expect(addToCart.map(([, params]) => params.contents)).toEqual([
      [{ content_id: 'vn_monthly_welcome50', quantity: 1 }],
      [{ content_id: 'vn_semiannual_welcome50', quantity: 1 }],
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
      contents: [{ content_id: '12-week', quantity: 1, price: 249000 }],
    }, { event_id: 'AddToCart.test-event-id' });
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

  it('gives every TikTok standard event a content_id', () => {
    trackStepViewed('paywall');
    trackEvent('offer_selected', { offer_id: '$rc_monthly', provider: 'revenuecat' });
    trackEvent('revenuecat_checkout_started', { plan: '$rc_six_month', value: 990000, currency: 'VND' });
    trackEvent('revenuecat_checkout_completed', { plan: '$rc_six_month', value: 990000, currency: 'VND' });
    const w = window as unknown as { ttq: { track: ReturnType<typeof vi.fn> } };
    const standard = w.ttq.track.mock.calls.filter(([event]) => /^[A-Z]/.test(event));
    expect(standard.map(([event]) => event)).toEqual(['ViewContent', 'AddToCart', 'AddToCart', 'InitiateCheckout', 'Purchase']);
    for (const [, params] of standard) {
      expect(params.contents).toEqual([expect.objectContaining({ content_id: expect.any(String) })]);
      expect(params).not.toHaveProperty('content_ids');
    }
  });

  it('keeps quiz screens off TikTok but on GA4', () => {
    trackStepViewed('height');
    trackStepViewed('target_weight');
    const w = window as unknown as { gtag: ReturnType<typeof vi.fn>; ttq: { track: ReturnType<typeof vi.fn> } };
    expect(w.gtag).toHaveBeenCalledWith('event', 'funnel_step_viewed', { step: 'target_weight' });
    expect(w.ttq.track).not.toHaveBeenCalled();
  });
});
