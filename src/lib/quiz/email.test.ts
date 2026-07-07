import { describe, it, expect } from 'vitest';
import { isValidEmail } from './email';

describe('isValidEmail', () => {
  it('accepts normal addresses', () => {
    expect(isValidEmail('a@b.vn')).toBe(true);
    expect(isValidEmail('nguyen.van.a+tag@gmail.com')).toBe(true);
  });

  it('rejects malformed addresses', () => {
    expect(isValidEmail('')).toBe(false);
    expect(isValidEmail('abc')).toBe(false);
    expect(isValidEmail('a@b')).toBe(false);
    expect(isValidEmail('a b@c.vn')).toBe(false);
  });
});
