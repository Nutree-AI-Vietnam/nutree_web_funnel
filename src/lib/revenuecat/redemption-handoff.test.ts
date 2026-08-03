import { describe, expect, it } from 'vitest';
import { redemptionHandoff } from './redemption-handoff';

describe('redemption handoff', () => {
  it('exposes a redemption link only after correlation acknowledgement', () => {
    expect(redemptionHandoff({ correlationAcknowledged: false, redeemUrl: 'https://redeem.test/token' })).toEqual({ kind: 'pending' });
    expect(redemptionHandoff({ correlationAcknowledged: true, redeemUrl: 'https://redeem.test/token', preflightToken: 'a'.repeat(43), handoffSiteUrl: 'https://quiz.preview.nutreeai.com' })).toEqual({
      kind: 'ready',
      redeemUrl: 'https://quiz.preview.nutreeai.com/redeem#v=redemption_handoff_v1&redeem_url=https%3A%2F%2Fredeem.test%2Ftoken&preflight_token=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    });
  });

  it('fails closed for missing or malformed redemption URLs', () => {
    expect(redemptionHandoff({ correlationAcknowledged: true, redeemUrl: null, preflightToken: 'a'.repeat(43), handoffSiteUrl: 'https://quiz.preview.nutreeai.com' })).toEqual({ kind: 'recovery' });
    expect(redemptionHandoff({ correlationAcknowledged: true, redeemUrl: 'javascript:alert(1)', preflightToken: 'a'.repeat(43), handoffSiteUrl: 'https://quiz.preview.nutreeai.com' })).toEqual({ kind: 'recovery' });
    expect(redemptionHandoff({ correlationAcknowledged: true, redeemUrl: 'https://redeem.test/token', preflightToken: null, handoffSiteUrl: 'https://quiz.preview.nutreeai.com' })).toEqual({ kind: 'recovery' });
    expect(redemptionHandoff({ correlationAcknowledged: true, redeemUrl: 'https://redeem.test/token', preflightToken: 'a'.repeat(43), handoffSiteUrl: 'https://attacker.test' })).toEqual({ kind: 'recovery' });
  });

  it('uses a fragment-only wrapper so browser requests and referrers exclude both bearer capabilities', () => {
    const handoff = redemptionHandoff({ correlationAcknowledged: true, redeemUrl: 'https://redeem.test/token?secret=value', preflightToken: 'a'.repeat(43), handoffSiteUrl: 'https://quiz.preview.nutreeai.com' });
    expect(handoff).toMatchObject({ kind: 'ready' });
    if (handoff.kind !== 'ready') throw new Error('Expected ready handoff.');
    const wrapped = new URL(handoff.redeemUrl);
    expect(wrapped.origin + wrapped.pathname + wrapped.search).toBe('https://quiz.preview.nutreeai.com/redeem');
    expect(wrapped.hash).toContain('redeem_url=https%3A%2F%2Fredeem.test%2Ftoken%3Fsecret%3Dvalue');
  });
});
