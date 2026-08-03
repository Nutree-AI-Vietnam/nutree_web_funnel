import { describe, expect, it } from 'vitest';
import { isFragmentCapabilityRoute } from './fragment-capability-route';

describe('fragment capability routes', () => {
  it('suppresses third-party browser code on every route that receives a secret fragment', () => {
    expect(isFragmentCapabilityRoute('/open-nutree')).toBe(true);
    expect(isFragmentCapabilityRoute('/redeem')).toBe(true);
    expect(isFragmentCapabilityRoute('/paywall')).toBe(false);
  });
});
