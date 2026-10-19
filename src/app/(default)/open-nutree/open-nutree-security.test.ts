import { describe, expect, it } from 'vitest';
import { openNutreeHeaders, openNutreeMetadata } from './security';

describe('open-nutree security', () => {
  it('is noindex and ships restrictive response headers', () => {
    expect(openNutreeMetadata.robots).toEqual({ index: false, follow: false });
    expect(openNutreeHeaders).toMatchObject({
      'Cache-Control': 'no-store',
      'Referrer-Policy': 'no-referrer',
    });
  });
});
