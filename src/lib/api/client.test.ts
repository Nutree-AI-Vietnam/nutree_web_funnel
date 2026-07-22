import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createLead,
  createMomoSubscriptionCheckout,
  getPaymentStatus,
  previewTdee,
} from './client';
import type { OnboardingPayload } from '../quiz/types';

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
  it('POSTs email + onboarding payload, returns lead identifiers', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(JSON.stringify({ web_user_id: 'w_1', claim_token: 'ct_1' }), { status: 200 }),
    );
    const lead = await createLead('a@b.vn', payload);
    expect(fetch).toHaveBeenCalledWith(
      'https://api.test/v1/web-funnel/leads',
      expect.objectContaining({ method: 'POST' }),
    );
    const body = JSON.parse((fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body);
    expect(body.email).toBe('a@b.vn');
    expect(body.onboarding_payload).toMatchObject({ fitness_goal: 'cut' });
    expect(lead).toEqual({ email: 'a@b.vn', web_user_id: 'w_1', claim_token: 'ct_1' });
  });
});

describe('createMomoSubscriptionCheckout', () => {
  it('creates a monthly MoMo subscription checkout', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(
        JSON.stringify({
          order_id: 'NUTREE1',
          pay_url: 'https://payment.test/pay',
          deeplink: null,
          qr_code_url: null,
          status: 'pending',
        }),
        { status: 200 },
      ),
    );

    const checkout = await createMomoSubscriptionCheckout('web_1');
    expect(fetch).toHaveBeenCalledWith(
      'https://api.test/v1/web-funnel/momo/subscription-checkouts',
      expect.objectContaining({ method: 'POST' }),
    );
    const body = JSON.parse((fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body);
    expect(body).toEqual({ web_user_id: 'web_1', plan_id: 'monthly' });
    expect(checkout.pay_url).toBe('https://payment.test/pay');
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
