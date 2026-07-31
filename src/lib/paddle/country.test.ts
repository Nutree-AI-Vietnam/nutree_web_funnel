import { describe, expect, it } from 'vitest';
import { normalizePaddleCountryCode } from './country';

describe('normalizePaddleCountryCode', () => {
  it('passes valid two-letter country codes', () => {
    expect(normalizePaddleCountryCode('gb')).toBe('GB');
    expect(normalizePaddleCountryCode(' IE ')).toBe('IE');
  });

  it('omits absent, malformed, and non-billing sentinels', () => {
    expect(normalizePaddleCountryCode(undefined)).toBeUndefined();
    expect(normalizePaddleCountryCode('OTHERS')).toBeUndefined();
    expect(normalizePaddleCountryCode('XX')).toBeUndefined();
    expect(normalizePaddleCountryCode('T1')).toBeUndefined();
  });
});

