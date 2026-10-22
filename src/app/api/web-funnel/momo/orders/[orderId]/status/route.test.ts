import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GET } from './route';

const orderId = '7fca4122bc86438a8a2ab4721f8a914d';
const url = `https://quiz.test/api/web-funnel/momo/orders/${orderId}/status`;

beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_API_BASE_URL', 'https://api.test');
  vi.stubEnv('WEB_FUNNEL_BFF_SHARED_SECRET', 'bff-secret');
  vi.stubGlobal('fetch', vi.fn());
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

function request(cookie = 'nutree_lead_access=access-key') {
  return new NextRequest(url, { headers: { cookie } });
}

const params = (id = orderId) => ({ params: Promise.resolve({ orderId: id }) });

describe('MoMo order status BFF', () => {
  it('passes through the status, plan and amount with server-held credentials and no Origin', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(Response.json({
      order_id: orderId, status: 'paid', plan: 'quarterly', amount: 249000, access_ends_at: '2027-01-14T00:00:00+00:00',
    }));

    const response = await GET(request(), params());

    expect(await response.json()).toEqual({ order_id: orderId, status: 'paid', plan: 'quarterly', amount: 249000 });
    expect(fetch).toHaveBeenCalledWith(`https://api.test/v1/web-funnel/momo/orders/${orderId}/status`, expect.objectContaining({
      headers: expect.objectContaining({ 'X-Lead-Access-Key': 'access-key', 'X-Web-Funnel-BFF-Token': 'bff-secret' }),
    }));
    expect((fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].headers).not.toHaveProperty('Origin');
  });

  it('answers null plan and amount when the API leaves them out', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(Response.json({ status: 'pending' }));
    expect(await (await GET(request(), params())).json()).toEqual({ order_id: orderId, status: 'pending', plan: null, amount: null });
  });

  it('rejects malformed ids and missing sessions before contacting the API', async () => {
    expect((await GET(request(), params('../leads'))).status).toBe(404);
    expect((await GET(request(''), params())).status).toBe(401);
    expect(fetch).not.toHaveBeenCalled();
  });
});
