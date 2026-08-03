import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from './route';

const url = 'https://quiz.test/api/web-funnel/leads/lead-1/revenuecat-correlation';

beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_API_BASE_URL', 'https://api.test');
  vi.stubEnv('WEB_FUNNEL_BFF_SHARED_SECRET', 'bff-secret');
  vi.stubGlobal('fetch', vi.fn());
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

function request(body: unknown, origin = 'https://quiz.test') {
  return new NextRequest(url, {
    method: 'POST', headers: { origin, cookie: 'nutree_lead_access=access-key', 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
}

describe('RevenueCat correlation BFF', () => {
  it('forwards only the anonymous customer ID with server-held credentials and returns a safe projection', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(new Response(JSON.stringify({
      lead_id: 'lead-1', masked_email: 'p***@example.com', status: 'payment_verified', access_key: 'secret', redemption_info: { redeem_url: 'secret' },
    }), { status: 200 }));

    const response = await POST(request({ app_user_id: '$RCAnonymousID:customer-1' }), { params: Promise.resolve({ leadId: 'lead-1' }) });

    expect(await response.json()).toEqual({ lead_id: 'lead-1', masked_email: 'p***@example.com', status: 'payment_verified' });
    expect(fetch).toHaveBeenCalledWith('https://api.test/v1/web-funnel/leads/lead-1/revenuecat-correlation', expect.objectContaining({
      method: 'POST', body: JSON.stringify({ app_user_id: '$RCAnonymousID:customer-1' }), headers: expect.objectContaining({ 'X-Lead-Access-Key': 'access-key', 'X-Web-Funnel-BFF-Token': 'bff-secret' }),
    }));
  });

  it('rejects cross-site and malformed requests before contacting the backend', async () => {
    expect((await POST(request({ app_user_id: 'customer-1' }, 'https://attacker.test'), { params: Promise.resolve({ leadId: 'lead-1' }) })).status).toBe(403);
    expect((await POST(request({ app_user_id: ' ' }), { params: Promise.resolve({ leadId: 'lead-1' }) })).status).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });
});
