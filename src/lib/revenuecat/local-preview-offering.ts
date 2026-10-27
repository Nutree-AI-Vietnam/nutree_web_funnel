import { PeriodUnit, type Offering, type Package, type Period, type Product } from '@revenuecat/purchases-js';

/**
 * A stand-in RevenueCat offering for localhost without a RevenueCat key, so the
 * paywall can be laid out and screenshotted. Prices mirror the live offerings:
 * the base package, its 50% welcome package and its 75% exit package.
 */
type PreviewPlan = {
  id: string;
  period: Period;
  label: string;
  prices: { base: number; welcome: number; exit: number };
  welcome: string;
  exit: string;
};

const USD_PLANS: PreviewPlan[] = [
  { id: '$rc_weekly', period: { number: 1, unit: PeriodUnit.Week }, label: '1-week', prices: { base: 4.99, welcome: 2.99, exit: 1.99 }, welcome: 'rc_weekly50', exit: 'rc_weekly75' },
  { id: '$rc_monthly', period: { number: 1, unit: PeriodUnit.Month }, label: '4-week', prices: { base: 15.99, welcome: 7.99, exit: 3.99 }, welcome: 'rc_monthly50', exit: 'rc_monthly75' },
  { id: '$rc_six_month', period: { number: 6, unit: PeriodUnit.Month }, label: '24-week', prices: { base: 42.99, welcome: 23.99, exit: 15.99 }, welcome: 'rc_6monthly50', exit: 'rc_6monthly75' },
];

const VND_PLANS: PreviewPlan[] = [
  { id: '$rc_weekly', period: { number: 1, unit: PeriodUnit.Week }, label: '1 tuần', prices: { base: 129000, welcome: 59000, exit: 29000 }, welcome: 'rc_weekly50', exit: 'rc_weekly75' },
  { id: '$rc_monthly', period: { number: 1, unit: PeriodUnit.Month }, label: '4 tuần', prices: { base: 399000, welcome: 199000, exit: 99000 }, welcome: 'rc_monthly50', exit: 'rc_monthly75' },
  { id: '$rc_six_month', period: { number: 6, unit: PeriodUnit.Month }, label: '24 tuần', prices: { base: 1099000, welcome: 599000, exit: 399000 }, welcome: 'rc_6monthly50', exit: 'rc_6monthly75' },
];

function previewPackage(identifier: string, amount: number, currency: string, period: Period): Package {
  const price = {
    amount: Math.round(amount * 100),
    amountMicros: Math.round(amount * 1_000_000),
    currency,
    formattedPrice: new Intl.NumberFormat(currency === 'VND' ? 'vi-VN' : 'en-US', { style: 'currency', currency }).format(amount),
  };
  const product = {
    identifier,
    displayName: identifier,
    title: identifier,
    description: null,
    currentPrice: price,
    price,
    period,
    normalPeriodDuration: null,
    presentedOfferingIdentifier: 'local_preview',
    introPricePhase: null,
    freeTrialPhase: null,
  } as unknown as Product;
  return { identifier, rcBillingProduct: product, webBillingProduct: product, packageType: 'custom' } as unknown as Package;
}

export function localPreviewOffering(countryCode: string): Offering {
  const vnd = countryCode === 'VN';
  const plans = vnd ? VND_PLANS : USD_PLANS;
  const currency = vnd ? 'VND' : 'USD';
  const availablePackages = plans.flatMap((plan) => [
    previewPackage(plan.id, plan.prices.base, currency, plan.period),
    previewPackage(plan.welcome, plan.prices.welcome, currency, plan.period),
    previewPackage(plan.exit, plan.prices.exit, currency, plan.period),
  ]);
  return {
    identifier: 'local_preview',
    serverDescription: 'Local preview',
    metadata: {
      recommended_package: '$rc_six_month',
      packages: Object.fromEntries(plans.map((plan) => [plan.id, { label: { en: plan.label, vi: plan.label }, welcome_package: plan.welcome, exit_package: plan.exit }])),
    },
    packagesById: Object.fromEntries(availablePackages.map((rcPackage) => [rcPackage.identifier, rcPackage])),
    availablePackages,
  } as unknown as Offering;
}
