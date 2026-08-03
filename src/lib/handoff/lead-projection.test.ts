import { describe, expect, it } from 'vitest';
import { safeLeadProjection, safeRevenueCatCorrelationProjection } from './lead-projection';

describe('safe lead projection', () => {
  it('returns only browser-safe fields and rejects malformed upstream data', () => {
    expect(safeLeadProjection({ lead_id: 'lead-1', masked_email: 'p***@example.com', status: 'checkout_started', access_key: 'secret', email: 'person@example.com' })).toEqual({ lead_id: 'lead-1', masked_email: 'p***@example.com', status: 'payment_pending' });
    expect(safeLeadProjection({ lead_id: 'lead-1', email: 'person@example.com' })).toBeNull();
  });
});

describe('safe RevenueCat correlation projection', () => {
  it('keeps the opaque preflight capability separate from the persistent lead projection', () => {
    const token = 'a'.repeat(43);
    expect(safeRevenueCatCorrelationProjection({
      lead_id: 'lead-1', masked_email: 'p***@example.com', status: 'payment_verified', preflight_token: token,
      access_key: 'secret', email: 'person@example.com', redemption_info: { redeem_url: 'secret' },
    })).toEqual({
      lead: { lead_id: 'lead-1', masked_email: 'p***@example.com', status: 'payment_verified' },
      preflightToken: token,
    });
  });

  it('fails closed when the correlation response has no valid opaque preflight capability', () => {
    expect(safeRevenueCatCorrelationProjection({
      lead_id: 'lead-1', masked_email: 'p***@example.com', status: 'payment_verified', preflight_token: 'short',
    })).toBeNull();
  });
});
