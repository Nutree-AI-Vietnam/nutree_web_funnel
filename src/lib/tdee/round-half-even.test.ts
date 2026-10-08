import { describe, expect, it } from 'vitest';
import { roundHalfEven1 } from './round-half-even';

describe('roundHalfEven1', () => {
  it('sends exact ties to the even tenth like Python round(x, 1)', () => {
    expect(roundHalfEven1(0.25)).toBe(0.2);
    expect(roundHalfEven1(0.75)).toBe(0.8);
    expect(roundHalfEven1(1252.75)).toBe(1252.8);
    expect(roundHalfEven1(1252.25)).toBe(1252.2);
    expect(roundHalfEven1(-0.25)).toBe(-0.2);
    expect(roundHalfEven1(-0.75)).toBe(-0.8);
  });

  it('rounds non-ties from the exact binary value', () => {
    // 0.15 is stored just below .15 and 0.45 just above .45.
    expect(roundHalfEven1(0.15)).toBe(0.1);
    expect(roundHalfEven1(0.45)).toBe(0.5);
    expect(roundHalfEven1(1503.36)).toBe(1503.4);
    expect(roundHalfEven1(93.6)).toBe(93.6);
    expect(roundHalfEven1(41.64)).toBe(41.6);
  });

  it('leaves integers and non-finite values unchanged', () => {
    expect(roundHalfEven1(1500)).toBe(1500);
    expect(roundHalfEven1(0)).toBe(0);
    expect(roundHalfEven1(Number.NaN)).toBeNaN();
    expect(roundHalfEven1(Number.POSITIVE_INFINITY)).toBe(Number.POSITIVE_INFINITY);
  });
});
