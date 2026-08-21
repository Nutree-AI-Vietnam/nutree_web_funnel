import { describe, expect, it } from 'vitest';
import { deriveAge, validateBirthDate } from './dob';

describe('DOB validation', () => {
  it('accepts a real adult DOB and derives age only from a supplied date', () => {
    expect(validateBirthDate({ birth_year: 1990, birth_month: 2, birth_day: 28 }, new Date('2026-08-02'))).toEqual({ valid: true, age: 36 });
    expect(deriveAge({ birth_year: 1990, birth_month: 8, birth_day: 2 }, new Date('2026-08-02'))).toBe(36);
  });

  it('rejects impossible, future, and below-minimum DOBs without fabricating a birthday', () => {
    expect(validateBirthDate({ birth_year: 2000, birth_month: 2, birth_day: 30 }, new Date('2026-08-02')).valid).toBe(false);
    expect(validateBirthDate({ birth_year: 2027, birth_month: 1, birth_day: 1 }, new Date('2026-08-02')).valid).toBe(false);
    expect(validateBirthDate({ birth_year: 2014, birth_month: 8, birth_day: 3 }, new Date('2026-08-02')).valid).toBe(false);
  });

  it('accepts the configured minimum age of 12', () => {
    expect(validateBirthDate({ birth_year: 2014, birth_month: 8, birth_day: 2 }, new Date('2026-08-02'))).toEqual({ valid: true, age: 12 });
  });
});
