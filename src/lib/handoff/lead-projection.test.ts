import { describe, expect, it } from 'vitest';
import { safeLeadProjection } from './lead-projection';

describe('safe lead projection', () => {
  it('returns only browser-safe fields and rejects malformed upstream data', () => {
    expect(safeLeadProjection({ lead_id: 'lead-1', masked_email: 'p***@example.com', status: 'checkout_started', access_key: 'secret', email: 'person@example.com' })).toEqual({ lead_id: 'lead-1', masked_email: 'p***@example.com', status: 'payment_pending' });
    expect(safeLeadProjection({ lead_id: 'lead-1', email: 'person@example.com' })).toBeNull();
  });
});
