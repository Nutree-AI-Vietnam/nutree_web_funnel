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

  it('says the secure sign-in email is sent only after verified payment', () => {
    expect(en.success.body).toMatch(/payment is verified/i);
    expect(en.success.body).toMatch(/secure sign-in email/i);
    expect(vi.success.body).toMatch(/thanh toán được xác minh/i);
    expect(vi.success.body).toMatch(/email đăng nhập bảo mật/i);
  });
});
