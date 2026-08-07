import { Purchases, type Package } from '@revenuecat/purchases-js';

type PublicEnvironment = Record<string, string | undefined>;

export interface RevenueCatPlan {
  id: '4-week' | '12-week' | '52-week';
  packageIdentifier: string;
}

export interface RevenueCatWebConfig {
  apiKey: string;
  offeringIdentifier: string;
  plans: RevenueCatPlan[];
}

function publicEnvironment(): PublicEnvironment {
  return {
    NEXT_PUBLIC_REVENUECAT_WEB_API_KEY: process.env.NEXT_PUBLIC_REVENUECAT_WEB_API_KEY,
    NEXT_PUBLIC_REVENUECAT_WEB_OFFERING_ID: process.env.NEXT_PUBLIC_REVENUECAT_WEB_OFFERING_ID,
    NEXT_PUBLIC_REVENUECAT_WEB_PACKAGE_4_WEEK: process.env.NEXT_PUBLIC_REVENUECAT_WEB_PACKAGE_4_WEEK,
    NEXT_PUBLIC_REVENUECAT_WEB_PACKAGE_12_WEEK: process.env.NEXT_PUBLIC_REVENUECAT_WEB_PACKAGE_12_WEEK,
    NEXT_PUBLIC_REVENUECAT_WEB_PACKAGE_52_WEEK: process.env.NEXT_PUBLIC_REVENUECAT_WEB_PACKAGE_52_WEEK,
  };
}

function required(source: PublicEnvironment, key: keyof PublicEnvironment): string {
  const value = source[key]?.trim();
  if (!value) throw new Error(`${key} is required before opening RevenueCat checkout.`);
  return value;
}

/** Reads browser-safe RevenueCat Web configuration. Paddle credentials stay in RevenueCat. */
export function readRevenueCatWebConfig(source: PublicEnvironment = publicEnvironment()): RevenueCatWebConfig {
  return {
    apiKey: required(source, 'NEXT_PUBLIC_REVENUECAT_WEB_API_KEY'),
    offeringIdentifier: required(source, 'NEXT_PUBLIC_REVENUECAT_WEB_OFFERING_ID'),
    plans: [
      { id: '4-week', packageIdentifier: required(source, 'NEXT_PUBLIC_REVENUECAT_WEB_PACKAGE_4_WEEK') },
      { id: '12-week', packageIdentifier: required(source, 'NEXT_PUBLIC_REVENUECAT_WEB_PACKAGE_12_WEEK') },
      { id: '52-week', packageIdentifier: required(source, 'NEXT_PUBLIC_REVENUECAT_WEB_PACKAGE_52_WEEK') },
    ],
  };
}

/** Legacy identified checkout remains available while redemption is default-off. */
export function configureRevenueCatForLead(config: RevenueCatWebConfig, leadId: string) {
  if (!leadId.trim()) throw new Error('A verified lead ID is required before opening RevenueCat checkout.');
  return Purchases.configure({
    apiKey: config.apiKey,
    appUserId: leadId,
  });
}

/** Configure one generated anonymous customer; backend later verifies and binds it to the lead. */
export function configureRevenueCatForAnonymousCheckout(config: RevenueCatWebConfig) {
  const appUserId = Purchases.generateRevenueCatAnonymousAppUserId();
  return { appUserId, purchases: Purchases.configure({ apiKey: config.apiKey, appUserId }) };
}

export function packagesByPlan(packages: Package[], plans: RevenueCatPlan[]): Record<RevenueCatPlan['id'], Package> {
  return Object.fromEntries(
    plans.flatMap((plan) => {
      const rcPackage = packages.find((candidate) => candidate.identifier === plan.packageIdentifier);
      return rcPackage ? [[plan.id, rcPackage]] : [];
    }),
  ) as Record<RevenueCatPlan['id'], Package>;
}
