import { describe, expect, it } from 'vitest';
import { redeemHeaders, redeemMetadata } from './security';

describe('redeem security', () => {
  it('is noindex and ships restrictive response headers', () => {
    expect(redeemMetadata.robots).toEqual({ index: false, follow: false });
    expect(redeemHeaders).toMatchObject({
      'Cache-Control': 'no-store',
      'Referrer-Policy': 'no-referrer',
    });
  });
});
