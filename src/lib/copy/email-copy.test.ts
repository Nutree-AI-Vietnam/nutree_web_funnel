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

  it('says the RevenueCat activation link is sent only after verified payment', () => {
    expect(en.success.body).toMatch(/payment is verified/i);
    expect(en.success.body).toMatch(/RevenueCat will send a secure link/i);
    expect(vi.success.body).toMatch(/thanh toán được xác minh/i);
    expect(vi.success.body).toMatch(/RevenueCat sẽ gửi liên kết bảo mật/i);
  });
});
