import { createHash } from 'node:crypto';
import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from './route';

const url = 'https://quiz.test/api/tiktok/events';
const emailHash = createHash('sha256').update('jane@example.com').digest('hex');
const properties = {
  value: 249000,
  currency: 'VND',
  content_type: 'product',
  contents: [{ content_id: '12-week', quantity: 1, price: 249000 }],
};
const browserEvent = {
  event: 'Purchase',
  event_id: 'Purchase.4f8e2c1a-9a3b-4c55-8d1e-2b7f6a0c9d13',
  properties,
  user: { email: emailHash, ttclid: 'E.C.P.Cs8B+click/1=' },
  page: { url: 'https://quiz.test/paywall', referrer: 'https://www.tiktok.com/' },
};

beforeEach(() => {
  vi.stubEnv('TIKTOK_EVENTS_API_ACCESS_TOKEN', 'events-token');
  vi.stubEnv('NEXT_PUBLIC_TIKTOK_PIXEL_ID', 'PIXEL123');
  vi.stubEnv('TIKTOK_EVENTS_API_TEST_CODE', '');
  vi.stubGlobal('fetch', vi.fn(async () => Response.json({ code: 0, message: 'OK' })));
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
      cookie: '_ttp=ttp-cookie-1; other=1',
      'x-forwarded-for': '203.0.113.7, 10.0.0.1',
      'user-agent': 'Mozilla/5.0 Test',
      'content-type': 'application/json',
      ...headers,
    },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

function sentBody() {
  const [, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
  return JSON.parse(init.body);
}

describe('TikTok Events API route', () => {
  it('forwards a standard event with the request context and the same event_id', async () => {
    const response = await POST(request(browserEvent));

    expect(response.status).toBe(204);
    const [target, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(target).toBe('https://business-api.tiktok.com/open_api/v1.3/event/track/');
    expect(init).toMatchObject({ method: 'POST', headers: { 'Access-Token': 'events-token', 'Content-Type': 'application/json' } });
    expect(sentBody()).toEqual({
      event_source: 'web',
      event_source_id: 'PIXEL123',
      data: [{
        event: 'Purchase',
        event_time: 1_760_000_000,
        event_id: browserEvent.event_id,
        user: {
          email: emailHash,
          ttclid: 'E.C.P.Cs8B+click/1=',
          ttp: 'ttp-cookie-1',
          ip: '203.0.113.7',
          user_agent: 'Mozilla/5.0 Test',
        },
        page: browserEvent.page,
        properties,
      }],
    });
  });

  it('marks events with the test event code when one is configured', async () => {
    vi.stubEnv('TIKTOK_EVENTS_API_TEST_CODE', 'TEST123');
    await POST(request(browserEvent));
    expect(sentBody().test_event_code).toBe('TEST123');
  });

  it('stays inert until the access token is set', async () => {
    vi.stubEnv('TIKTOK_EVENTS_API_ACCESS_TOKEN', '');
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
    for (const body of ['not json', { ...browserEvent, event: 'funnel_step_viewed' }, { ...browserEvent, event_id: 'bad id' }, 'x'.repeat(20_000)]) {
      const response = await POST(request(body));
      expect(response.status).toBeGreaterThanOrEqual(400);
    }
    expect(fetch).not.toHaveBeenCalled();
  });

  it('drops unhashed identifiers and cuts page URLs to origin and path', async () => {
    await POST(request({
      ...browserEvent,
      user: { email: 'jane@example.com', external_id: 'lead-123' },
      page: { url: 'https://quiz.test/paywall?email=jane@example.com#token', referrer: 'javascript:alert(1)' },
      properties: { ...properties, currency: 'vnd', note: 'free text' },
    }));
    const [data] = sentBody().data;
    expect(data.user).toEqual({ ttp: 'ttp-cookie-1', ip: '203.0.113.7', user_agent: 'Mozilla/5.0 Test' });
    expect(data.page).toEqual({ url: 'https://quiz.test/paywall' });
    expect(data.properties).toEqual({ content_type: 'product', contents: properties.contents });
  });

  it('returns 204 and logs only the TikTok error when the event is rejected', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(Response.json({ code: 40002, message: 'Invalid parameter' }));
    const response = await POST(request(browserEvent));
    expect(response.status).toBe(204);
    expect(console.warn).toHaveBeenCalledWith('TikTok Events API rejected an event', { event: 'Purchase', status: 200, code: 40002, message: 'Invalid parameter' });
    expect(JSON.stringify((console.warn as ReturnType<typeof vi.fn>).mock.calls)).not.toContain(emailHash);
  });

  it('returns 204 when TikTok is unreachable', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new TypeError('fetch failed'));
    const response = await POST(request(browserEvent));
    expect(response.status).toBe(204);
    expect(console.warn).toHaveBeenCalledWith('TikTok Events API request failed', { event: 'Purchase', error: 'TypeError' });
  });
});
