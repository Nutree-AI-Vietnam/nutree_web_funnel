import type { Offering, Package } from '@revenuecat/purchases-js';
import { describe, expect, it } from 'vitest';
import { billingLabelFromPeriod, buildRevenueCatPaywall, checkoutPackage, defaultPaywallPlan } from './paywall-plans';

function rcPackage(identifier: string, product: { title?: string; description?: string | null; period?: { number: number; unit: string } | null }): Package {
  return {
    identifier,
    webBillingProduct: { title: product.title ?? '', description: product.description ?? null, period: product.period ?? null },
  } as unknown as Package;
}

function offering(packages: Package[], metadata: Record<string, unknown> | null = null): Offering {
  return { identifier: 'web_default', metadata, availablePackages: packages } as unknown as Offering;
}

const weekly = rcPackage('$rc_weekly', { title: 'Nutree Weekly', description: 'Weekly access', period: { number: 1, unit: 'week' } });
const monthly = rcPackage('$rc_monthly', { title: 'Nutree Monthly', period: { number: 1, unit: 'month' } });
const quarterly = rcPackage('$rc_three_month', { title: 'Nutree 12 Weeks', period: { number: 12, unit: 'week' } });

describe('buildRevenueCatPaywall', () => {
  it('keeps the dashboard package order and uses offering metadata copy per locale', () => {
    const paywall = buildRevenueCatPaywall(offering([weekly, monthly, quarterly], {
      recommended_package: '$rc_three_month',
      recommendation_note: { en: '12 weeks builds the habit.', vi: '12 tuần tạo thói quen.' },
      packages: {
        $rc_weekly: {},
        $rc_monthly: {},
        $rc_three_month: {
          label: { en: '12-week', vi: '12 tuần' },
          description: { en: 'Full rhythm', vi: 'Đủ nhịp' },
          billing_label: { en: 'Every 12 weeks', vi: 'Mỗi 12 tuần' },
        },
      },
    }));

    expect(paywall.plans.map((plan) => plan.id)).toEqual(['$rc_weekly', '$rc_monthly', '$rc_three_month']);
    expect(paywall.plans[2]).toMatchObject({
      label: { en: '12-week', vi: '12 tuần' },
      description: { en: 'Full rhythm', vi: 'Đủ nhịp' },
      billingLabel: { en: 'Every 12 weeks', vi: 'Mỗi 12 tuần' },
      recommended: true,
      rcPackage: quarterly,
    });
    expect(paywall.recommendationNote).toEqual({ en: '12 weeks builds the habit.', vi: '12 tuần tạo thói quen.' });
    expect(defaultPaywallPlan(paywall.plans)?.id).toBe('$rc_three_month');
  });

  it('falls back to the product title, description, and billing period without metadata', () => {
    const paywall = buildRevenueCatPaywall(offering([weekly, monthly]));

    expect(paywall.plans[0]).toMatchObject({
      label: { en: 'Nutree Weekly', vi: 'Nutree Weekly' },
      description: { en: 'Weekly access', vi: 'Weekly access' },
      billingLabel: { en: 'Every 1 week', vi: 'Mỗi 1 tuần' },
      recommended: false,
    });
    expect(paywall.plans[1]?.description).toEqual({ en: '', vi: '' });
    expect(paywall.recommendationNote).toBeNull();
    expect(defaultPaywallPlan(paywall.plans)?.id).toBe('$rc_weekly');
  });

  it('fills a missing locale from the other one and ignores a recommended package not in the offering', () => {
    const paywall = buildRevenueCatPaywall(offering([monthly], {
      recommended_package: '$rc_annual',
      packages: { $rc_monthly: { label: { vi: '4 tuần' }, description: 'Flexible' } },
    }));

    expect(paywall.plans[0]).toMatchObject({
      label: { en: '4 tuần', vi: '4 tuần' },
      description: { en: 'Flexible', vi: 'Flexible' },
      recommended: false,
    });
  });
});

describe('offer packages', () => {
  const weekly50 = rcPackage('rc_weekly50', { title: 'Weekly discount 50', period: { number: 1, unit: 'week' } });
  const weekly75 = rcPackage('rc_weekly75', { title: 'Weekly discount 75', period: { number: 1, unit: 'week' } });
  const annual = rcPackage('$rc_annual', { title: 'Annual', period: { number: 1, unit: 'year' } });

  it('hides discount packages and attaches them to their base plan by convention', () => {
    const paywall = buildRevenueCatPaywall(offering([weekly50, weekly75, weekly, monthly]));

    expect(paywall.plans.map((plan) => plan.id)).toEqual(['$rc_weekly', '$rc_monthly']);
    expect(paywall.plans[0]?.offerPackages).toEqual({ welcome: weekly50, exit: weekly75 });
    expect(paywall.plans[1]?.offerPackages).toEqual({ welcome: null, exit: null });
  });

  it('shows only packages listed in metadata and reads offer package ids from it', () => {
    const paywall = buildRevenueCatPaywall(offering([weekly50, weekly75, weekly, annual], {
      packages: { $rc_weekly: { welcome_package: 'rc_weekly75', exit_package: 'rc_weekly50' } },
    }));

    expect(paywall.plans.map((plan) => plan.id)).toEqual(['$rc_weekly']);
    expect(paywall.plans[0]?.offerPackages).toEqual({ welcome: weekly75, exit: weekly50 });
  });

  it('buys the offer package when present and the base package otherwise', () => {
    const [withOffers, withoutOffers] = buildRevenueCatPaywall(offering([weekly50, weekly, monthly])).plans;

    expect(checkoutPackage(withOffers!, 'welcome')).toBe(weekly50);
    expect(checkoutPackage(withOffers!, 'exit')).toBe(weekly);
    expect(checkoutPackage(withOffers!, null)).toBe(weekly);
    expect(checkoutPackage(withoutOffers!, 'welcome')).toBe(monthly);
  });
});

describe('billingLabelFromPeriod', () => {
  it('formats singular and plural periods in both locales', () => {
    expect(billingLabelFromPeriod({ number: 1, unit: 'week' } as never)).toEqual({ en: 'Every 1 week', vi: 'Mỗi 1 tuần' });
    expect(billingLabelFromPeriod({ number: 3, unit: 'month' } as never)).toEqual({ en: 'Every 3 months', vi: 'Mỗi 3 tháng' });
    expect(billingLabelFromPeriod(null)).toEqual({ en: '', vi: '' });
  });
});
