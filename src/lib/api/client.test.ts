import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createLead,
  createCheckout,
  getFunnelContext,
  getPaymentStatus,
  previewTdee,
  revealWelcomeReward,
} from './client';
import { createFallbackFunnelContext, getRecommendedOffer } from '../funnel/catalog';
import type { FunnelOffer, OnboardingPayload } from '../quiz/types';

const payload: OnboardingPayload = {
  age: 30,
  gender: 'male',
  height_cm: 175,
  weight_kg: 75,
  job_type: 'desk',
  fitness_goal: 'cut',
  training_days_per_week: 4,
  training_minutes_per_session: 60,
  measurement_unit: 'metric',
};

beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_API_BASE_URL', 'https://api.test');
  vi.stubGlobal('fetch', vi.fn());
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('previewTdee', () => {
  it('POSTs the TdeePreviewRequest shape and normalizes the response', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(
        JSON.stringify({
          bmr: 1698.75,
          tdee: 2038.5,
          goal: 'cut',
          macros: { calories: 1538.5, protein: 165, carbs: 84.6, fat: 60 },
        }),
        { status: 200 },
      ),
    );

    const result = await previewTdee(payload);

    expect(fetch).toHaveBeenCalledWith(
      'https://api.test/v1/tdee/preview',
      expect.objectContaining({ method: 'POST' }),
    );
    const body = JSON.parse((fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body);
    expect(body).toEqual({
      age: 30,
      sex: 'male',
      height: 175,
      weight: 75,
      job_type: 'desk',
      training_days_per_week: 4,
      training_minutes_per_session: 60,
      goal: 'cut',
      unit_system: 'metric',
    });
    expect(result).toEqual({
      bmr: 1698.75,
      tdee: 2038.5,
      calories: 1538.5,
      protein_g: 165,
      carbs_g: 84.6,
      fat_g: 60,
    });
  });

  it('prefers *_grams fields when the backend sends them', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(
        JSON.stringify({
          bmr: 1,
          tdee: 2,
          goal: 'cut',
          macros: {
            calories: 3,
            protein: 0,
            carbs: 0,
            fat: 0,
            protein_grams: 165,
            carbs_grams: 85,
            fat_grams: 60,
          },
        }),
        { status: 200 },
      ),
    );
    const result = await previewTdee(payload);
    expect(result.protein_g).toBe(165);
    expect(result.carbs_g).toBe(85);
    expect(result.fat_g).toBe(60);
  });

  it('throws on non-2xx', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(new Response('{}', { status: 500 }));
    await expect(previewTdee(payload)).rejects.toThrow();
  });
});

describe('createLead', () => {
  it('creates a pre-authentication lead with the quiz payload', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(JSON.stringify({ lead_id: 'lead-1', masked_email: 'pe***@example.com' }), {
        status: 200,
      }),
    );

    const lead = await createLead('person@example.com', payload);

    expect(fetch).toHaveBeenCalledWith(
      'https://api.test/v1/web-funnel/leads',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(JSON.parse((fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body)).toEqual({
      email: 'person@example.com',
      onboarding_payload: payload,
      source: 'nutree_web_funnel',
    });
    expect(lead).toEqual({
      email: 'person@example.com',
      lead_id: 'lead-1',
      masked_email: 'pe***@example.com',
    });
  });
});

describe('funnel context helpers', () => {
  it('return deterministic fallback context without missing context/reward routes', async () => {
    const context = await getFunnelContext();
    const revealed = await revealWelcomeReward('session-1', 'lead-1');

    expect(fetch).not.toHaveBeenCalled();
    expect(context.provider).toBe('PAYPAL');
    expect(revealed.welcome_reward.code).toBe('WELCOME50');
  });
});

describe('createCheckout', () => {
  const offer: FunnelOffer = {
    id: 'intl_quarterly_welcome50',
    market: 'INTL',
    provider: 'PAYPAL',
    currency: 'USD',
    label: '12-week',
    description: 'Recommended',
    period_unit: 'MONTH',
    period_count: 3,
    standard_amount: 19.99,
    welcome_amount: 9.99,
    amount_due_today: 9.99,
    renewal_amount: 19.99,
    renewal_description: '$19.99 every 12 weeks',
    next_billing_date: '2026-10-01T00:00:00.000Z',
    reward_id: 'WELCOME50',
    reward_applied: true,
    price_locked_while_active: true,
    recommended: true,
    provider_plan_id: 'P-PLAN',
  };

  it('creates a backend-owned PayPal checkout with server commercial fields', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(
        JSON.stringify({
          checkoutId: 'checkout-1',
          status: 'PENDING_APPROVAL',
          provider: 'paypal',
          planId: 'P-PLAN',
          customId: 'custom-1',
          offerId: 'intl_quarterly_welcome50',
          rewardId: 'WELCOME50',
          currency: 'USD',
          amountMinor: 999,
          standardAmountMinor: 1999,
          renewalAmountMinor: 1999,
          renewalDescription: '$19.99 every 12 weeks',
          renewalInterval: 'quarterly',
          welcomeDiscountPercent: 50,
        }),
        { status: 200 },
      ),
    );

    const checkout = await createCheckout({
      leadId: 'lead-1',
      offer,
      billingCountry: 'US',
    });

    expect(fetch).toHaveBeenCalledWith(
      'https://api.test/v1/web-funnel/checkouts',
      expect.objectContaining({ method: 'POST' }),
    );
    const body = JSON.parse((fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body);
    expect(body).toMatchObject({
      lead_id: 'lead-1',
      offer_id: 'intl_quarterly_welcome50',
      reward_id: 'WELCOME50',
      billing_country: 'US',
    });
    expect(body.idempotency_key).toEqual(expect.any(String));
    expect(checkout.provider).toBe('PAYPAL');
    expect(checkout.amountDueToday).toBe(9.99);
    expect(checkout.standardAmount).toBe(19.99);
    expect(checkout.renewalDescription).toBe('$19.99 every 12 weeks');
    expect(checkout.paypal?.planId).toBe('P-PLAN');
    expect('claimToken' in checkout).toBe(false);
  });

  it('sends the backend reward code when using the real fallback catalog offer', async () => {
    const context = createFallbackFunnelContext('US');
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(
        JSON.stringify({
          checkoutId: 'checkout-1',
          status: 'PENDING_APPROVAL',
          provider: 'paypal',
          planId: 'P-PLAN',
          customId: 'custom-1',
          offerId: 'intl_quarterly_welcome50',
          rewardId: 'WELCOME50',
          currency: 'USD',
          amountMinor: 999,
          standardAmountMinor: 1999,
          renewalAmountMinor: 1999,
          renewalDescription: '$19.99 every 12 weeks',
          renewalInterval: 'quarterly',
          welcomeDiscountPercent: 50,
        }),
        { status: 200 },
      ),
    );

    await createCheckout({
      leadId: 'lead-1',
      offer: getRecommendedOffer(context.offers),
      billingCountry: 'US',
    });

    const body = JSON.parse((fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body);
    expect(getRecommendedOffer(context.offers).reward_id).toBe('rw_welcome50_preview');
    expect(body.reward_id).toBe('WELCOME50');
  });
});

describe('getPaymentStatus', () => {
  it('fetches payment status by order id', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(JSON.stringify({ order_id: 'NUTREE1', status: 'paid', paid: true }), {
        status: 200,
      }),
    );

    const status = await getPaymentStatus('NUTREE1');
    expect(fetch).toHaveBeenCalledWith(
      'https://api.test/v1/web-funnel/payment-orders/NUTREE1/status',
    );
    expect(status.paid).toBe(true);
  });
});
