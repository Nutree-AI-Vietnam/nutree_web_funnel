import { createHash } from 'node:crypto';
import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from './route';

const url = 'https://quiz.test/api/meta/events';
const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');
const emailHash = sha256('jane@example.com');
const nameHash = sha256('jane');
const leadHash = sha256('lead-1');
const fbclid = 'IwAR2xYz-AbC_123';
const productData = {
  content_type: 'product',
  num_items: 1,
  content_ids: ['12-week'],
  content_name: '12-week',
  contents: [{ id: '12-week', quantity: 1 }],
};
const customData = { value: 249000, currency: 'VND', ...productData };
const browserEvent = {
  event_name: 'Purchase',
  event_id: 'Purchase.4f8e2c1a-9a3b-4c55-8d1e-2b7f6a0c9d13',
  event_source_url: 'https://quiz.test/paywall',
  custom_data: customData,
  locale: 'vi',
  user_data: { em: emailHash, fn: nameHash, external_id: leadHash, fbc: `fb.1.1759999000000.${fbclid}` },
};

beforeEach(() => {
  vi.stubEnv('VERCEL_ENV', 'production');
  vi.stubEnv('META_CONVERSIONS_API_ACCESS_TOKEN', 'capi-token');
  vi.stubEnv('NEXT_PUBLIC_META_PIXEL_ID', '1234567890');
  vi.stubEnv('META_CONVERSIONS_API_TEST_EVENT_CODE', '');
  vi.stubGlobal('fetch', vi.fn(async () => Response.json({ events_received: 1, messages: [], fbtrace_id: 'trace-1' })));
  vi.spyOn(Date, 'now').mockReturnValue(1_760_000_000_000);
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function request(body: unknown, headers: Record<string, string> = {}) {
  return new NextRequest(url, {
    method: 'POST',
    headers: {
      origin: 'https://quiz.test',
      cookie: '_fbp=fb.1.1759990000000.1116446470; other=1',
      'x-forwarded-for': '203.0.113.7, 10.0.0.1',
      'user-agent': 'Mozilla/5.0 Test',
      'content-type': 'application/json',
      ...headers,
    },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

function sentBodies() {
  return (fetch as ReturnType<typeof vi.fn>).mock.calls.map(([, init]) => JSON.parse(init.body));
}

describe('Meta Conversions API route', () => {
  it('forwards a standard event with the request context and the pixel eventID', async () => {
    const response = await POST(request(browserEvent));

    expect(response.status).toBe(204);
    const [target, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(target).toBe('https://graph.facebook.com/v26.0/1234567890/events');
    expect(init).toMatchObject({ method: 'POST', headers: { Authorization: 'Bearer capi-token', 'Content-Type': 'application/json' } });
    expect(sentBodies()[0]).toEqual({
      data: [{
        event_name: 'Purchase',
        event_time: 1_760_000_000,
        event_id: browserEvent.event_id,
        action_source: 'website',
        event_source_url: 'https://quiz.test/paywall',
        user_data: {
          em: [emailHash],
          fn: [nameHash],
          external_id: [leadHash],
          client_ip_address: '203.0.113.7',
          client_user_agent: 'Mozilla/5.0 Test',
          fbp: 'fb.1.1759990000000.1116446470',
          fbc: `fb.1.1759999000000.${fbclid}`,
        },
        custom_data: customData,
      }],
    });
    expect(console.warn).not.toHaveBeenCalled();
  });

  it('marks events with the test event code when one is configured', async () => {
    vi.stubEnv('META_CONVERSIONS_API_TEST_EVENT_CODE', 'TEST123');
    await POST(request(browserEvent));
    expect(sentBodies()[0].test_event_code).toBe('TEST123');
  });

  it.each(['preview', 'development', undefined])('forwards nothing from a %s deployment without a test event code', async (vercelEnv) => {
    vi.stubEnv('VERCEL_ENV', vercelEnv);
    const response = await POST(request(browserEvent));
    expect(response.status).toBe(204);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('forwards only as a test event outside production', async () => {
    vi.stubEnv('VERCEL_ENV', 'preview');
    vi.stubEnv('META_CONVERSIONS_API_TEST_EVENT_CODE', 'TEST123');
    await POST(request(browserEvent));
    expect(sentBodies()[0].test_event_code).toBe('TEST123');
  });

  it('stays inert until the access token is set', async () => {
    vi.stubEnv('META_CONVERSIONS_API_ACCESS_TOKEN', '');
    const response = await POST(request(browserEvent));
    expect(response.status).toBe(204);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('rejects cross-site posts', async () => {
    const response = await POST(request(browserEvent, { origin: 'https://evil.test' }));
    expect(response.status).toBe(403);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('rejects malformed bodies and events outside the standard list', async () => {
    for (const body of ['not json', {}, { ...browserEvent, event_name: 'AddToCart' }, { ...browserEvent, event_id: 'bad id' }, 'x'.repeat(20_000)]) {
      const response = await POST(request(body));
      expect(response.status).toBeGreaterThanOrEqual(400);
    }
    expect(fetch).not.toHaveBeenCalled();
  });

  it('drops unhashed identifiers, odd cookies and fields Meta does not need', async () => {
    await POST(request({
      ...browserEvent,
      event_source_url: 'https://quiz.test/paywall?email=jane@example.com#token',
      user_data: { em: 'jane@example.com', fn: 'Jane', external_id: 'lead-1', fbc: fbclid, ph: sha256('0900000000') },
      custom_data: { ...customData, note: 'free text', content_type: 'product_group' },
    }, { cookie: '_fbp=not-a-cookie' }));
    const [data] = sentBodies()[0].data;
    expect(data.event_source_url).toBe('https://quiz.test/paywall');
    expect(data.user_data).toEqual({ client_ip_address: '203.0.113.7', client_user_agent: 'Mozilla/5.0 Test' });
    expect(data.custom_data).toEqual({ ...customData, content_type: undefined });
  });

  it('sends value only above 0 and together with its currency', async () => {
    for (const commerce of [{ value: 0, currency: 'VND' }, { value: 249000 }, { value: 249000, currency: 'vnd' }, { value: '249000', currency: 'VND' }]) {
      await POST(request({ ...browserEvent, custom_data: { ...productData, ...commerce } }));
    }
    await POST(request({ ...browserEvent, custom_data: { value: 9.99, currency: 'USD' } }));
    const sent = sentBodies().map((body) => body.data[0].custom_data);
    for (const data of sent.slice(0, 4)) {
      expect(data).not.toHaveProperty('value');
      expect(data).not.toHaveProperty('currency');
    }
    expect(sent[4]).toEqual({ value: 9.99, currency: 'USD' });
  });

  it('prefers the pixel _fbc cookie for the same click and the browser fbc for a newer one', async () => {
    const cookie = `fb.1.1759998000000.${fbclid}`;
    await POST(request(browserEvent, { cookie: `_fbc=${cookie}` }));
    await POST(request(browserEvent, { cookie: `_fbc=${cookie}.AQ` }));
    await POST(request(browserEvent, { cookie: '_fbc=fb.1.1750000000000.older-click' }));
    await POST(request({ ...browserEvent, user_data: {} }, { cookie: `_fbc=${cookie}` }));
    expect(sentBodies().map((body) => body.data[0].user_data.fbc)).toEqual([
      cookie,
      `${cookie}.AQ`,
      browserEvent.user_data.fbc,
      cookie,
    ]);
  });

  it('keeps long click IDs whole and drops longer ones', async () => {
    const fbc = `fb.1.1759999000000.${'x'.repeat(1000)}`;
    await POST(request({ ...browserEvent, user_data: { fbc } }));
    await POST(request({ ...browserEvent, user_data: { fbc: `${fbc}${'x'.repeat(100)}` } }));
    const [kept, dropped] = sentBodies().map((body) => body.data[0].user_data);
    expect(kept.fbc).toBe(fbc);
    expect(dropped).not.toHaveProperty('fbc');
  });

  it('returns 204 and logs only the Meta error when the event is rejected', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(Response.json({
      error: {
        message: 'Invalid parameter',
        type: 'OAuthException',
        code: 100,
        error_subcode: 2804019,
        error_user_title: 'Invalid value',
        error_user_msg: `The value ${emailHash} is invalid`,
        fbtrace_id: 'trace-2',
      },
    }, { status: 400 }));
    const response = await POST(request(browserEvent));
    expect(response.status).toBe(204);
    expect(console.warn).toHaveBeenCalledWith('Meta Conversions API rejected an event', {
      event: 'Purchase',
      status: 400,
      code: 100,
      subcode: 2804019,
      title: 'Invalid value',
      message: 'Invalid parameter',
      trace: 'trace-2',
    });
    const logged = JSON.stringify((console.warn as ReturnType<typeof vi.fn>).mock.calls);
    expect(logged).not.toContain(emailHash);
    expect(logged).not.toContain('capi-token');
  });

  it('sends an English event to the English dataset and keeps the event id', async () => {
    vi.stubEnv('NEXT_PUBLIC_META_PIXEL_ID_EN', '2222222222');
    vi.stubEnv('META_CONVERSIONS_API_ACCESS_TOKEN_EN', 'en-token');
    vi.stubEnv('META_CONVERSIONS_API_TEST_EVENT_CODE', 'VI_TEST');
    vi.stubEnv('META_CONVERSIONS_API_TEST_EVENT_CODE_EN', 'EN_TEST');
    const response = await POST(request({ ...browserEvent, locale: 'en', pixel_id: '9999999999' }));
    expect(response.status).toBe(204);
    const [target, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(target).toBe('https://graph.facebook.com/v26.0/2222222222/events');
    expect(String(target)).not.toContain('9999999999');
    expect(String(target)).not.toContain('1234567890');
    expect(init.headers.Authorization).toBe('Bearer en-token');
    expect(sentBodies()[0].test_event_code).toBe('EN_TEST');
    expect(sentBodies()[0].data[0].event_id).toBe(browserEvent.event_id);
  });

  it('keeps Vietnamese events on the default dataset when the English one is configured', async () => {
    vi.stubEnv('NEXT_PUBLIC_META_PIXEL_ID_EN', '2222222222');
    vi.stubEnv('META_CONVERSIONS_API_ACCESS_TOKEN_EN', 'en-token');
    await POST(request(browserEvent));
    const [target, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(target).toBe('https://graph.facebook.com/v26.0/1234567890/events');
    expect(init.headers.Authorization).toBe('Bearer capi-token');
  });

  it('falls back to the default pixel and token when the English dataset is unset', async () => {
    vi.stubEnv('NEXT_PUBLIC_META_PIXEL_ID_EN', '');
    vi.stubEnv('META_CONVERSIONS_API_ACCESS_TOKEN_EN', '');
    vi.stubEnv('META_CONVERSIONS_API_TEST_EVENT_CODE', 'VI_TEST');
    vi.stubEnv('META_CONVERSIONS_API_TEST_EVENT_CODE_EN', 'EN_TEST');
    await POST(request({ ...browserEvent, locale: 'en' }));
    const [target, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(target).toBe('https://graph.facebook.com/v26.0/1234567890/events');
    expect(init.headers.Authorization).toBe('Bearer capi-token');
    expect(sentBodies()[0].test_event_code).toBe('VI_TEST');
  });

  it('defaults a missing locale to the Vietnamese dataset', async () => {
    vi.stubEnv('NEXT_PUBLIC_META_PIXEL_ID_EN', '2222222222');
    vi.stubEnv('META_CONVERSIONS_API_ACCESS_TOKEN_EN', 'en-token');
    const event = { ...browserEvent, locale: undefined };
    const response = await POST(request(event));
    expect(response.status).toBe(204);
    const [target, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(target).toBe('https://graph.facebook.com/v26.0/1234567890/events');
    expect(init.headers.Authorization).toBe('Bearer capi-token');
    expect(String(init.headers.Authorization)).not.toContain('en-token');
  });

  it('falls back to the Vietnamese pair when the English pixel has no token', async () => {
    vi.stubEnv('NEXT_PUBLIC_META_PIXEL_ID_EN', '2222222222');
    vi.stubEnv('META_CONVERSIONS_API_ACCESS_TOKEN_EN', '');
    vi.stubEnv('META_CONVERSIONS_API_TEST_EVENT_CODE', 'VI_TEST');
    vi.stubEnv('META_CONVERSIONS_API_TEST_EVENT_CODE_EN', 'EN_TEST');
    await POST(request({ ...browserEvent, locale: 'en' }));
    const [target, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(target).toBe('https://graph.facebook.com/v26.0/1234567890/events');
    expect(String(target)).not.toContain('2222222222');
    expect(init.headers.Authorization).toBe('Bearer capi-token');
    expect(sentBodies()[0].test_event_code).toBe('VI_TEST');
  });

  it('falls back to the Vietnamese pair when the English token has no pixel', async () => {
    vi.stubEnv('NEXT_PUBLIC_META_PIXEL_ID_EN', '');
    vi.stubEnv('META_CONVERSIONS_API_ACCESS_TOKEN_EN', 'en-token');
    vi.stubEnv('META_CONVERSIONS_API_TEST_EVENT_CODE', 'VI_TEST');
    vi.stubEnv('META_CONVERSIONS_API_TEST_EVENT_CODE_EN', 'EN_TEST');
    await POST(request({ ...browserEvent, locale: 'en' }));
    const [target, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(target).toBe('https://graph.facebook.com/v26.0/1234567890/events');
    expect(init.headers.Authorization).toBe('Bearer capi-token');
    expect(String(init.headers.Authorization)).not.toContain('en-token');
    expect(sentBodies()[0].test_event_code).toBe('VI_TEST');
  });

  it('rejects unknown locales and does not forward a client pixel id', async () => {
    vi.stubEnv('NEXT_PUBLIC_META_PIXEL_ID_EN', '2222222222');
    vi.stubEnv('META_CONVERSIONS_API_ACCESS_TOKEN_EN', 'en-token');
    for (const locale of ['fr', 'EN', 'english', '9999999999', 1, null]) {
      const response = await POST(request({ ...browserEvent, locale, pixel_id: '9999999999' }));
      expect(response.status).toBe(400);
    }
    expect(fetch).not.toHaveBeenCalled();
  });

  it('returns 204 when Meta is unreachable', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new TypeError('fetch failed'));
    const response = await POST(request(browserEvent));
    expect(response.status).toBe(204);
    expect(console.warn).toHaveBeenCalledWith('Meta Conversions API request failed', { event: 'Purchase', error: 'TypeError' });
  });
});
