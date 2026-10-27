import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MOMO_UNAVAILABLE } from '@/lib/payments/momo-checkout';
import { POST } from './route';

const cardPlanPrice = vi.hoisted(() => vi.fn());
vi.mock('@/lib/payments/momo-card-price', () => ({ cardPlanPrice }));

const url = 'https://quiz.test/api/web-funnel/momo/checkouts';
const body = { package_id: 'rc_6monthly50', method: 'wallet', lang: 'vi', lead_id: 'lead-1' };
const payUrl = 'https://test-payment.momo.vn/v2/gateway/pay?t=1';

beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_API_BASE_URL', 'https://api.test');
  vi.stubEnv('WEB_FUNNEL_BFF_SHARED_SECRET', 'bff-secret');
  vi.stubGlobal('fetch', vi.fn());
  cardPlanPrice.mockReset();
  cardPlanPrice.mockResolvedValue({ packageId: 'rc_6monthly50', weeks: 24, amount: 599_000 });
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

function request(origin = 'https://quiz.test', sent: unknown = body) {
  return new NextRequest(url, {
    method: 'POST', headers: { origin, cookie: 'nutree_lead_access=access-key', 'Content-Type': 'application/json' }, body: JSON.stringify(sent),
  });
}

describe('MoMo checkout BFF', () => {
  it('prices the pass from the picked package and returns the MoMo pay link without sending an Origin upstream', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(Response.json({ order_id: 'a'.repeat(32), pay_url: payUrl, amount: 599_000 }, { status: 201 }));

    const response = await POST(request());

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ order_id: 'a'.repeat(32), pay_url: payUrl, amount: 599_000 });
    expect(cardPlanPrice).toHaveBeenCalledWith('rc_6monthly50');
    const [upstreamUrl, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(upstreamUrl).toBe('https://api.test/v1/web-funnel/momo/checkouts');
    expect(JSON.parse(init.body)).toEqual({ package_id: 'rc_6monthly50', weeks: 24, amount: 599_000, method: 'wallet', lang: 'vi', lead_id: 'lead-1' });
    expect(init.headers).not.toHaveProperty('Origin');
  });

  it('ignores any amount the browser sends', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(Response.json({ order_id: 'a'.repeat(32), pay_url: payUrl, amount: 599_000 }, { status: 201 }));

    await POST(request(undefined, { ...body, amount: 1_000, weeks: 104 }));

    expect(JSON.parse((fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body)).toMatchObject({ weeks: 24, amount: 599_000 });
  });

  it('rejects a package the offering does not price in VND', async () => {
    cardPlanPrice.mockResolvedValue(null);

    const response = await POST(request());

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ detail: MOMO_UNAVAILABLE });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('rejects a malformed package id or method before reading prices', async () => {
    expect((await POST(request(undefined, { ...body, package_id: '../plans' }))).status).toBe(400);
    expect((await POST(request(undefined, { ...body, method: 'card' }))).status).toBe(400);
    expect(cardPlanPrice).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('is unavailable while the card prices cannot be read', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    cardPlanPrice.mockRejectedValue(new Error('RevenueCat products: HTTP 500'));

    const response = await POST(request());

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ detail: MOMO_UNAVAILABLE });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('treats a checkout without the charged amount as unavailable', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(Response.json({ order_id: 'a'.repeat(32), pay_url: payUrl }, { status: 201 }));

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
    expect(cardPlanPrice).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });
});
