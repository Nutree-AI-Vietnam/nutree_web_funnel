import { describe, expect, it } from 'vitest';
import { clearPendingRedemptionCorrelation, readPendingRedemptionCorrelation, redemptionHandoff, redemptionLinkHash, savePendingRedemptionCorrelation } from './redemption-handoff';

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
    values,
  };
}

describe('redemption handoff', () => {
  it('exposes only an email activation outcome after correlation acknowledgement', () => {
    expect(redemptionHandoff({ correlationAcknowledged: false, redemptionLinkHash: 'a'.repeat(64) })).toEqual({ kind: 'pending' });
    expect(redemptionHandoff({ correlationAcknowledged: true, redemptionLinkHash: 'a'.repeat(64) })).toEqual({ kind: 'email_sent' });
  });

  it('hashes the raw link without returning it and fails closed when unavailable', async () => {
    const rawLink = 'https://redeem.test/token';
    await expect(redemptionLinkHash(rawLink)).resolves.toBe('e0b11b09be73ee47d9380b59eef9590fb4eb42fa10734fca6cfbcb8cecf9d25b');
    expect(redemptionHandoff({ correlationAcknowledged: true, redemptionLinkHash: null })).toEqual({ kind: 'recovery' });
    await expect(redemptionLinkHash(null)).resolves.toBeNull();
  });

  it('persists only a valid hash to resume correlation after a reload', () => {
    const storage = memoryStorage();
    const correlation = { leadId: 'lead-1', appUserId: '$RCAnonymousID:customer-1', redemptionLinkHash: 'a'.repeat(64) };
    savePendingRedemptionCorrelation(correlation, storage);

    expect(readPendingRedemptionCorrelation(storage)).toEqual(correlation);
    expect([...storage.values.values()].join('')).not.toContain('https://redeem.test/token');

    clearPendingRedemptionCorrelation('lead-1', storage);
    expect(readPendingRedemptionCorrelation(storage)).toBeNull();
  });
});
