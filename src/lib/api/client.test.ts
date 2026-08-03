import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createLead,
  correlateRevenueCatCustomer,
  previewTdee,
  toWebFunnelSnapshot,
} from './client';
import type { OnboardingPayload } from '../quiz/types';

const payload: OnboardingPayload = {
  birth_year: 1996,
  birth_month: 3,
  birth_day: 14,
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
  it('uses the same-origin BFF and returns only the safe lead projection', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(new Response(JSON.stringify({
      lead_id: 'lead-1', masked_email: 'p***@example.com', status: 'payment_pending',
    }), { status: 201 }));

    await expect(createLead('person@example.com', payload)).resolves.toEqual({
      lead_id: 'lead-1', masked_email: 'p***@example.com', status: 'payment_pending',
    });
    expect(fetch).toHaveBeenCalledWith('/api/web-funnel/leads', expect.objectContaining({ method: 'POST' }));
    const leadRequest = (fetch as ReturnType<typeof vi.fn>).mock.calls.find(([url]) => url === '/api/web-funnel/leads');
    expect(leadRequest?.[1].headers).not.toHaveProperty('X-Lead-Access-Key');
  });
});

describe('correlateRevenueCatCustomer', () => {
  it('uses the same-origin BFF and only returns the safe lead projection', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(new Response(JSON.stringify({
      lead_id: 'lead-1', masked_email: 'p***@example.com', status: 'payment_verified', redemption_info: { redeem_url: 'secret' },
    }), { status: 200 }));

    await expect(correlateRevenueCatCustomer('lead-1', '$RCAnonymousID:customer-1', 'a'.repeat(64))).resolves.toEqual({
      lead_id: 'lead-1', masked_email: 'p***@example.com', status: 'payment_verified',
    });
    expect(fetch).toHaveBeenCalledWith('/api/web-funnel/leads/lead-1/revenuecat-correlation', expect.objectContaining({
      method: 'POST', credentials: 'same-origin', body: JSON.stringify({ app_user_id: '$RCAnonymousID:customer-1', redemption_link_hash: 'a'.repeat(64) }),
    }));
  });
});

describe('toWebFunnelSnapshot', () => {
  it("maps the web quiz shape to the backend's strict mobile-compatible snapshot", () => {
    expect(toWebFunnelSnapshot(payload)).toEqual({
      birth_year: 1996, birth_month: 3, birth_day: 14, gender: 'male', height: 175, weight: 75,
      job_type: 'desk', training_days_per_week: 4, training_minutes_per_session: 60, goal: 'cut',
      pain_points: [], dietary_preferences: [], target_weight_kg: undefined,
    });
  });
});
