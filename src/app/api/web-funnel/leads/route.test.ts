import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from './route';

const url = 'https://quiz.test/api/web-funnel/leads';

beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_API_BASE_URL', 'https://api.test');
  vi.stubEnv('WEB_FUNNEL_BFF_SHARED_SECRET', 'bff-secret');
  vi.stubGlobal('fetch', vi.fn());
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

function request(requestId = 'request-1') {
  return new NextRequest(url, {
    method: 'POST',
    headers: { origin: 'https://quiz.test', cookie: 'nutree_lead_access=access-key', 'X-Request-ID': requestId },
    body: JSON.stringify({ email: 'test@example.com', payload: {} }),
  });
}

describe('web funnel lead BFF', () => {
  it('returns upstream validation details with the request ID', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(new Response(JSON.stringify({ detail: [{ loc: ['body', 'payload', 'goal'], msg: 'Field required' }] }), { status: 422 }));

    const response = await POST(request('request-422'));

    expect(response.status).toBe(422);
    expect(response.headers.get('X-Request-ID')).toBe('request-422');
    expect(await response.json()).toEqual({ detail: [{ loc: ['body', 'payload', 'goal'], msg: 'Field required' }], request_id: 'request-422' });
  });
});
