import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MOMO_UNAVAILABLE } from '@/lib/payments/momo-checkout';
import { POST } from './route';

const url = 'https://quiz.test/api/web-funnel/momo/checkouts';
const body = { plan: 'quarterly', method: 'wallet', lang: 'vi', lead_id: 'lead-1' };

beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_API_BASE_URL', 'https://api.test');
  vi.stubEnv('WEB_FUNNEL_BFF_SHARED_SECRET', 'bff-secret');
  vi.stubGlobal('fetch', vi.fn());
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

function request(origin = 'https://quiz.test') {
  return new NextRequest(url, {
    method: 'POST', headers: { origin, cookie: 'nutree_lead_access=access-key', 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
}

describe('MoMo checkout BFF', () => {
  it('returns the MoMo pay link without sending an Origin upstream', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(Response.json({
      order_id: 'a'.repeat(32), pay_url: 'https://test-payment.momo.vn/v2/gateway/pay?t=1', amount: 249000,
    }, { status: 201 }));

    const response = await POST(request());

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ order_id: 'a'.repeat(32), pay_url: 'https://test-payment.momo.vn/v2/gateway/pay?t=1', amount: 249000 });
    expect((fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].headers).not.toHaveProperty('Origin');
  });

  it('treats a checkout without the charged amount as unavailable', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(Response.json({
      order_id: 'a'.repeat(32), pay_url: 'https://test-payment.momo.vn/v2/gateway/pay?t=1',
    }, { status: 201 }));

    const response = await POST(request());

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ detail: MOMO_UNAVAILABLE });
  });

  it('hides the names of missing MoMo settings from shoppers', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(Response.json({
      detail: { message: 'MoMo is not configured', missing: ['MOMO_PARTNER_CODE', 'MOMO_SECRET_KEY'] },
    }, { status: 503 }));

    const response = await POST(request());

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ detail: MOMO_UNAVAILABLE });
  });

  it('rejects cross-site requests before contacting the API', async () => {
    expect((await POST(request('https://attacker.test'))).status).toBe(403);
    expect(fetch).not.toHaveBeenCalled();
  });
});
