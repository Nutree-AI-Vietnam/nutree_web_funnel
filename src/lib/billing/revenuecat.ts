import { Purchases, type Package } from '@revenuecat/purchases-js';

let instance: Purchases | null = null;

/** Configure RC Web Billing with backend-issued web_user_id so purchase attaches to the lead. */
export function configureBilling(webUserId: string): Purchases {
  const key = process.env.NEXT_PUBLIC_RC_WEB_BILLING_KEY;
  if (!key) throw new Error('NEXT_PUBLIC_RC_WEB_BILLING_KEY is not set');
  if (!instance || instance.getAppUserId() !== webUserId) {
    instance = Purchases.configure(key, webUserId);
  }
  return instance;
}

export async function getPackages(webUserId: string): Promise<Package[]> {
  const purchases = configureBilling(webUserId);
  const offerings = await purchases.getOfferings();
  return offerings.current?.availablePackages ?? [];
}

/** Runs RC's hosted checkout. Resolves true if any entitlement is active afterwards. */
export async function purchasePackage(
  webUserId: string,
  pkg: Package,
  email: string,
): Promise<boolean> {
  const purchases = configureBilling(webUserId);
  const { customerInfo } = await purchases.purchase({ rcPackage: pkg, customerEmail: email });
  return Object.keys(customerInfo.entitlements.active).length > 0;
}
