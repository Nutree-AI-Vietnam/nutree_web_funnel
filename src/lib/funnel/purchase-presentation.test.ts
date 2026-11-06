import { describe, expect, it } from 'vitest';
import {
  isVietQrPurchasePackage,
  purchaseLocaleFor,
  showsAppHandoffQr,
  showsVietQrPurchase,
  visiblePaywallPlans,
} from './purchase-presentation';

const subscription = {
  id: '$rc_monthly',
  label: { en: '4-week', vi: '4 tuần' },
  description: { en: 'Renews with Paddle', vi: 'Gia hạn qua Paddle' },
};

const vietQr = {
  id: 'vietqr_pass_30',
  label: { en: 'VietQR 30 days', vi: 'VietQR 30 ngày' },
  description: { en: 'Pay by QR code', vi: 'Quét mã để thanh toán' },
};

describe('purchase presentation', () => {
  it('treats VietQR package ids and QR purchase copy as QR purchases', () => {
    expect(isVietQrPurchasePackage(['vietqr_monthly', '4 tuần', 'Gói tháng'])).toBe(true);
    expect(isVietQrPurchasePackage(['$rc_monthly', 'Pay by QR code', '4 tuần'])).toBe(true);
    expect(isVietQrPurchasePackage(['momo_qr_pass', '30 ngày', ''])).toBe(true);
    expect(isVietQrPurchasePackage(['$rc_monthly', '4-week', 'Payments are processed securely by Paddle.'])).toBe(false);
  });

  it('uses the route locale before hydration and the selected locale after', () => {
    expect(purchaseLocaleFor('en', 'vi', false)).toBe('en');
    expect(purchaseLocaleFor('vi', 'en', false)).toBe('vi');
    expect(purchaseLocaleFor('vi', 'en', true)).toBe('en');
    expect(purchaseLocaleFor('en', 'vi', true)).toBe('vi');
  });

  it('hides VietQR packages for English and keeps them for Vietnamese, ignoring country', () => {
    expect(showsVietQrPurchase('en')).toBe(false);
    expect(showsVietQrPurchase('vi')).toBe(true);
    expect(visiblePaywallPlans([vietQr, subscription], 'en').map((plan) => plan.id)).toEqual(['$rc_monthly']);
    expect(visiblePaywallPlans([vietQr, subscription], 'vi').map((plan) => plan.id)).toEqual(['vietqr_pass_30', '$rc_monthly']);
  });

  it('does not paint the app-handoff QR for English, including before hydration', () => {
    expect(showsAppHandoffQr('en', false)).toBe(false);
    expect(showsAppHandoffQr('en', true)).toBe(false);
    expect(showsAppHandoffQr('vi', false)).toBe(false);
    expect(showsAppHandoffQr('vi', true)).toBe(true);
  });
});
