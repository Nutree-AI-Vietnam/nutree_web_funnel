import { describe, expect, it } from 'vitest';
import { redemptionHandoff } from './redemption-handoff';

describe('redemption handoff', () => {
  it('exposes a redemption link only after correlation acknowledgement', () => {
    expect(redemptionHandoff({ correlationAcknowledged: false, redeemUrl: 'https://redeem.test/token' })).toEqual({ kind: 'pending' });
    expect(redemptionHandoff({ correlationAcknowledged: true, redeemUrl: 'https://redeem.test/token' })).toEqual({ kind: 'ready', redeemUrl: 'https://redeem.test/token' });
  });

  it('fails closed for missing or malformed redemption URLs', () => {
    expect(redemptionHandoff({ correlationAcknowledged: true, redeemUrl: null })).toEqual({ kind: 'recovery' });
    expect(redemptionHandoff({ correlationAcknowledged: true, redeemUrl: 'javascript:alert(1)' })).toEqual({ kind: 'recovery' });
  });
});
