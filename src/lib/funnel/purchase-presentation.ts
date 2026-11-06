/**
 * What the quiz may show as a way to pay.
 *
 * English hides VietQR packages, QR images, and QR purchase buttons.
 * Vietnamese keeps the same payment flow. The choice is the selected funnel
 * locale, never the billing country.
 *
 * Paddle stays the existing RevenueCat checkout. This file does not open a
 * new provider or change a backend.
 */

export type PurchaseLocale = 'en' | 'vi';

const VIETQR_PURCHASE = /viet\s*qr|vietqr|qr[_\s-]?(?:pay|payment|purchase|code)|momo[_\s-]?qr|chuyển\s*khoản|chuyen\s*khoan|quét\s*mã|quet\s*ma/i;

export function isVietQrPurchaseText(value: string | null | undefined): boolean {
  return typeof value === 'string' && VIETQR_PURCHASE.test(value);
}

/** True when a RevenueCat package is a VietQR / QR-bank purchase, from its id or copy. */
export function isVietQrPurchasePackage(fields: Array<string | null | undefined>): boolean {
  return fields.some((field) => isVietQrPurchaseText(field));
}

/**
 * Purchase presentation follows the survey URL, not a previously stored locale.
 * An explicit `/survey/en` stays English after hydration even when the tab
 * last saved Vietnamese. Country is not an input.
 */
export function purchaseLocaleFor(routeLocale: PurchaseLocale, storedLocale: PurchaseLocale, hydrated: boolean): PurchaseLocale {
  // The survey URL is the explicit handoff. A stored locale must not override it.
  void storedLocale;
  void hydrated;
  return routeLocale;
}

export function showsVietQrPurchase(locale: PurchaseLocale): boolean {
  return locale === 'vi';
}

/** Desktop app-open QR after purchase. English never paints it. */
export function showsAppHandoffQr(locale: PurchaseLocale, hydrated: boolean): boolean {
  return hydrated && locale === 'vi';
}

type PaywallPlanCopy = {
  id: string;
  label: { en: string; vi: string };
  description: { en: string; vi: string };
};

/** English plan list with VietQR packages removed. Vietnamese list is unchanged. */
export function visiblePaywallPlans<T extends PaywallPlanCopy>(plans: readonly T[], locale: PurchaseLocale): T[] {
  if (locale !== 'en') return [...plans];
  return plans.filter((plan) => !isVietQrPurchasePackage([
    plan.id,
    plan.label.en,
    plan.label.vi,
    plan.description.en,
    plan.description.vi,
  ]));
}
