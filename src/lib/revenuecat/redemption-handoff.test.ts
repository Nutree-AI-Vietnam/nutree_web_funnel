import { describe, expect, it } from 'vitest';
import { clearPendingRedemptionCorrelation, readPendingRedemptionCorrelation, redemptionHandoff, redemptionLinkHash, redemptionUrlFromCheckoutOperation, savePendingRedemptionCorrelation } from './redemption-handoff';

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

  it('uses the inner redemption URL when RevenueCat wraps it in an HTTPS redirect', async () => {
    const innerLink = 'rc-test://redeem_web_purchase?redemption_token=opaque';
    const redirectLink = `https://api.revenuecat.com/rcbilling/v1/redirect?url=${encodeURIComponent(innerLink)}`;

    await expect(redemptionLinkHash(redirectLink)).resolves.toBe(await redemptionLinkHash(innerLink));
  });

  it('matches shared silent-login hash goldens', async () => {
    await expect(redemptionLinkHash('https://redeem.test/token')).resolves.toBe(
      'e0b11b09be73ee47d9380b59eef9590fb4eb42fa10734fca6cfbcb8cecf9d25b',
    );
    await expect(
      redemptionLinkHash('rc-test://redeem_web_purchase?redemption_token=opaque'),
    ).resolves.toBe('becc43a70131005e53d56a70e1f75bf7dfcd5d05f9b994f04966a15309d5882f');
    const inner = 'rc-test://redeem_web_purchase?redemption_token=opaque';
    const redirect = `https://api.revenuecat.com/rcbilling/v1/redirect?url=${encodeURIComponent(inner)}`;
    await expect(redemptionLinkHash(redirect)).resolves.toBe(
      'becc43a70131005e53d56a70e1f75bf7dfcd5d05f9b994f04966a15309d5882f',
    );
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

  it('missing digest after pay is recovery, never access or second checkout', () => {
    expect(redemptionHandoff({ correlationAcknowledged: true, redemptionLinkHash: null })).toEqual({
      kind: 'recovery',
    });
    expect(redemptionHandoff({ correlationAcknowledged: false, redemptionLinkHash: null })).toEqual({
      kind: 'pending',
    });
  });

  it('recovers a redemption URL published after Paddle checkout completes', async () => {
    const fetcher = async () => new Response(JSON.stringify({ operation: { redemption_info: { redeem_url: 'rc-test://redeem_web_purchase?redemption_token=opaque' } } }), { status: 200 });

    await expect(redemptionUrlFromCheckoutOperation('rcb_sb_test', 'operation-1', { fetcher, attempts: 1 })).resolves.toBe('rc-test://redeem_web_purchase?redemption_token=opaque');
  });

  it('retries when RevenueCat has not published the redemption URL yet', async () => {
    let calls = 0;
    const fetcher = async () => {
      calls += 1;
      return new Response(JSON.stringify(calls === 1 ? { operation: { redemption_info: null } } : { operation: { redemption_info: { redeem_url: 'rc-test://redeem_web_purchase?redemption_token=opaque' } } }), { status: 200 });
    };

    await expect(redemptionUrlFromCheckoutOperation('rcb_sb_test', 'operation-1', { fetcher, attempts: 2, delayMs: 0 })).resolves.toBe('rc-test://redeem_web_purchase?redemption_token=opaque');
    expect(calls).toBe(2);
  });
});
