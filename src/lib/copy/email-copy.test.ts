import { describe, expect, it } from 'vitest';
import { en } from './en';
import { vi } from './vi';

describe('email capture copy', () => {
  it('describes email capture without requiring Google sign-in', () => {
    for (const copy of [en, vi]) {
      expect(copy.email.placeholder).not.toHaveLength(0);
      expect(copy.email.body).not.toMatch(/google/i);
      expect(copy.email.helper).not.toMatch(/google/i);
      expect(copy.email.cta).not.toMatch(/google/i);
    }
  });

  it('explains that the saved plan opens through the emailed secure link', () => {
    expect(en.success.body).toMatch(/secure link/i);
    expect(vi.success.body).toMatch(/link bảo mật/i);
  });
});
