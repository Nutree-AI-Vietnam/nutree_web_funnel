import type { Offering, Package, Period } from '@revenuecat/purchases-js';

export type PaywallLocale = 'en' | 'vi';
export type LocalizedText = Record<PaywallLocale, string>;

/** A paywall plan built from one package of the RevenueCat offering. `id` is the package identifier. */
export interface RevenueCatPaywallPlan {
  id: string;
  rcPackage: Package;
  label: LocalizedText;
  description: LocalizedText;
  billingLabel: LocalizedText;
  recommended: boolean;
}

export interface RevenueCatPaywall {
  plans: RevenueCatPaywallPlan[];
  recommendationNote: LocalizedText | null;
}

/**
 * Offering metadata shape configured in the RevenueCat dashboard. Every field is optional;
 * missing package copy falls back to the product title/description and billing period.
 *
 * {
 *   "recommended_package": "$rc_three_month",
 *   "recommendation_note": { "en": "...", "vi": "..." },
 *   "packages": {
 *     "$rc_three_month": {
 *       "label": { "en": "12-week", "vi": "12 tuần" },
 *       "description": { "en": "...", "vi": "..." },
 *       "billing_label": { "en": "Every 12 weeks", "vi": "Mỗi 12 tuần" }
 *     }
 *   }
 * }
 */
interface PackageMetadata {
  label?: unknown;
  description?: unknown;
  billing_label?: unknown;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function nonEmptyString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

/** Accepts either `{ en, vi }` or a single string used for both locales. */
function localizedText(value: unknown): LocalizedText | null {
  const single = nonEmptyString(value);
  if (single) return { en: single, vi: single };
  const record = asRecord(value);
  if (!record) return null;
  const en = nonEmptyString(record.en);
  const vi = nonEmptyString(record.vi);
  if (!en && !vi) return null;
  return { en: en ?? vi ?? '', vi: vi ?? en ?? '' };
}

const periodUnits: Record<Period['unit'], { en: [string, string]; vi: string }> = {
  day: { en: ['day', 'days'], vi: 'ngày' },
  week: { en: ['week', 'weeks'], vi: 'tuần' },
  month: { en: ['month', 'months'], vi: 'tháng' },
  year: { en: ['year', 'years'], vi: 'năm' },
};

export function billingLabelFromPeriod(period: Period | null | undefined): LocalizedText {
  if (!period) return { en: '', vi: '' };
  const unit = periodUnits[period.unit];
  return {
    en: `Every ${period.number} ${period.number === 1 ? unit.en[0] : unit.en[1]}`,
    vi: `Mỗi ${period.number} ${unit.vi}`,
  };
}

export function buildRevenueCatPaywall(offering: Offering): RevenueCatPaywall {
  const metadata = asRecord(offering.metadata);
  const packagesMetadata = asRecord(metadata?.packages);
  const availableIds = offering.availablePackages.map((rcPackage) => rcPackage.identifier);
  const configuredRecommended = nonEmptyString(metadata?.recommended_package);
  const recommendedId = configuredRecommended && availableIds.includes(configuredRecommended) ? configuredRecommended : null;

  const plans = offering.availablePackages.map((rcPackage): RevenueCatPaywallPlan => {
    const product = rcPackage.webBillingProduct;
    const packageMetadata = (asRecord(packagesMetadata?.[rcPackage.identifier]) ?? {}) as PackageMetadata;
    const productTitle = nonEmptyString(product.title) ?? rcPackage.identifier;
    const productDescription = nonEmptyString(product.description) ?? '';
    return {
      id: rcPackage.identifier,
      rcPackage,
      label: localizedText(packageMetadata.label) ?? { en: productTitle, vi: productTitle },
      description: localizedText(packageMetadata.description) ?? { en: productDescription, vi: productDescription },
      billingLabel: localizedText(packageMetadata.billing_label) ?? billingLabelFromPeriod(product.period),
      recommended: rcPackage.identifier === recommendedId,
    };
  });

  return { plans, recommendationNote: localizedText(metadata?.recommendation_note) };
}

export function defaultPaywallPlan(plans: RevenueCatPaywallPlan[]): RevenueCatPaywallPlan | undefined {
  return plans.find((plan) => plan.recommended) ?? plans[0];
}
