import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cardPlanPrice, resetCardPlanPrices } from './momo-card-price';

function option(base: [number, string, string], intro?: [number, string]) {
  return {
    base: { price: { amount_micros: base[0] * 1_000_000, currency: base[1] }, period_duration: base[2] },
    intro_price: intro ? { price: { amount_micros: intro[0] * 1_000_000, currency: intro[1] }, period_duration: base[2] } : null,
  };
}

const offerings = {
  offerings: [
    { identifier: 'other', packages: [{ identifier: '$rc_weekly', platform_product_identifier: 'other_weekly' }] },
    {
      identifier: 'vn_web',
      packages: [
        { identifier: '$rc_six_month', platform_product_identifier: 'premium_6m' },
        { identifier: 'rc_6monthly50', platform_product_identifier: 'premium_6m_50' },
        { identifier: '$rc_monthly', platform_product_identifier: 'premium_1m' },
        { identifier: '$rc_weekly', platform_product_identifier: 'premium_1w_usd' },
      ],
    },
  ],
};

const products = {
  product_details: [
    { identifier: 'premium_6m', default_purchase_option_id: 'base', purchase_options: { base: option([1_099_000, 'VND', 'P6M']) } },
    { identifier: 'premium_6m_50', default_purchase_option_id: 'welcome', purchase_options: { welcome: option([1_099_000, 'VND', 'P6M'], [599_000, 'VND']) } },
    { identifier: 'premium_1m', default_purchase_option_id: 'base', purchase_options: { base: option([399_000, 'VND', 'P1M']) } },
    { identifier: 'premium_1w_usd', default_purchase_option_id: 'base', purchase_options: { base: option([5, 'USD', 'P1W']) } },
  ],
};

function revenueCat() {
  return vi.fn(async (input: string | URL | Request) => {
    const url = String(input);
    if (url.includes('/offerings')) return Response.json(offerings);
    if (url.includes('/products?')) return Response.json(products);
    return new Response(null, { status: 404 });
  });
}

beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_REVENUECAT_WEB_API_KEY', 'rcb_test_key');
  vi.stubEnv('NEXT_PUBLIC_REVENUECAT_WEB_OFFERING_ID', 'vn_web');
  resetCardPlanPrices();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('cardPlanPrice', () => {
  it('charges the first card payment: the intro price while an offer runs, else the base price', async () => {
    const fetchMock = revenueCat();

    await expect(cardPlanPrice('rc_6monthly50', fetchMock)).resolves.toEqual({ packageId: 'rc_6monthly50', weeks: 24, amount: 599_000 });
    await expect(cardPlanPrice('$rc_six_month', fetchMock)).resolves.toEqual({ packageId: '$rc_six_month', weeks: 24, amount: 1_099_000 });
    await expect(cardPlanPrice('$rc_monthly', fetchMock)).resolves.toEqual({ packageId: '$rc_monthly', weeks: 4, amount: 399_000 });
  });

  it('reads the configured offering in VND with the web key', async () => {
    const fetchMock = revenueCat();

    await cardPlanPrice('$rc_monthly', fetchMock);

    const [productsUrl, init] = fetchMock.mock.calls[1] as unknown as [string, RequestInit];
    expect(productsUrl).toContain('/rcbilling/v1/subscribers/');
    expect(productsUrl).toContain('id=premium_6m&id=premium_6m_50&id=premium_1m&id=premium_1w_usd&currency=VND');
    expect(init.headers).toMatchObject({ Authorization: 'Bearer rcb_test_key', 'X-Platform': 'web', 'X-Is-Sandbox': 'false' });
  });

  it('prices nothing outside VND or outside the offering', async () => {
    const fetchMock = revenueCat();

    await expect(cardPlanPrice('$rc_weekly', fetchMock)).resolves.toBeNull();
    await expect(cardPlanPrice('rc_yearly', fetchMock)).resolves.toBeNull();
  });

  it('keeps prices for five minutes', async () => {
    const fetchMock = revenueCat();

    await cardPlanPrice('rc_6monthly50', fetchMock, 0);
    await cardPlanPrice('$rc_monthly', fetchMock, 4 * 60_000);
    expect(fetchMock).toHaveBeenCalledTimes(2);

    await cardPlanPrice('$rc_monthly', fetchMock, 6 * 60_000);
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it('looks again for a package it has not seen once the prices are half a minute old', async () => {
    const fetchMock = revenueCat();

    await cardPlanPrice('rc_6monthly50', fetchMock, 0);
    await cardPlanPrice('rc_yearly', fetchMock, 10_000);
    expect(fetchMock).toHaveBeenCalledTimes(2);

    await cardPlanPrice('rc_yearly', fetchMock, 31_000);
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it('throws when RevenueCat cannot be read or is not configured', async () => {
    await expect(cardPlanPrice('$rc_monthly', vi.fn(async () => new Response(null, { status: 500 })))).rejects.toThrow('HTTP 500');

    vi.stubEnv('NEXT_PUBLIC_REVENUECAT_WEB_OFFERING_ID', '');
    await expect(cardPlanPrice('$rc_monthly', revenueCat())).rejects.toThrow('config is missing');
  });
});
