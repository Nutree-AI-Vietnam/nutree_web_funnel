import 'server-only';
import { momoWeeksForPeriod } from '@/lib/payments/momo-checkout';

/** What a MoMo pass charges for a card plan: the plan's first Paddle payment, for the plan's weeks. */
export interface CardPlanPrice {
  packageId: string;
  weeks: number;
  /** Whole dong. */
  amount: number;
}

type Fetch = typeof fetch;

const REVENUECAT_API = 'https://api.revenuecat.com';
// A fixed anonymous customer for reading prices, so price reads never create a customer per buyer.
const PRICING_APP_USER_ID = '$RCAnonymousID:6d6f6d6f70726963696e670000000000';
const CACHE_MS = 5 * 60_000;

let cache: { key: string; at: number; prices: Map<string, CardPlanPrice> } | null = null;

function headers(apiKey: string): HeadersInit {
  return {
    Authorization: `Bearer ${apiKey}`,
    Accept: 'application/json',
    'X-Platform': 'web',
    'X-Is-Sandbox': String(apiKey.startsWith('rcb_sb_')),
  };
}

/** ISO 8601 period ("P1W", "P1M", "P6M", "P1Y") as the paywall's period. */
function parsePeriod(value: unknown): { number: number; unit: string } | null {
  const match = typeof value === 'string' ? /^P(\d+)([DWMY])$/.exec(value) : null;
  if (!match) return null;
  const unit = { D: 'day', W: 'week', M: 'month', Y: 'year' }[match[2] as 'D' | 'W' | 'M' | 'Y'];
  return { number: Number(match[1]), unit };
}

interface PricePhase { price?: { amount_micros?: unknown; currency?: unknown } | null; period_duration?: unknown }
interface ProductDetail {
  identifier?: unknown;
  default_purchase_option_id?: unknown;
  purchase_options?: Record<string, { base?: PricePhase | null; intro_price?: PricePhase | null }>;
}

/**
 * The card plans of the Vietnamese offering, priced as the paywall shows them: the default purchase option's intro
 * price, else its base price, in VND. Read from RevenueCat Billing, which serves the Paddle prices, the same two
 * requests the paywall's SDK makes. Kept five minutes per offering.
 */
async function loadPrices(fetchImpl: Fetch, apiKey: string, offeringId: string): Promise<Map<string, CardPlanPrice>> {
  const user = encodeURIComponent(PRICING_APP_USER_ID);
  const offeringsResponse = await fetchImpl(`${REVENUECAT_API}/v1/subscribers/${user}/offerings`, { headers: headers(apiKey), cache: 'no-store' });
  if (!offeringsResponse.ok) throw new Error(`RevenueCat offerings: HTTP ${offeringsResponse.status}`);
  const offerings = (await offeringsResponse.json()) as { offerings?: { identifier?: unknown; packages?: { identifier?: unknown; platform_product_identifier?: unknown }[] }[] };
  const offering = offerings.offerings?.find((item) => item.identifier === offeringId);
  const packages = (offering?.packages ?? []).flatMap((item) => (
    typeof item.identifier === 'string' && typeof item.platform_product_identifier === 'string'
      ? [{ packageId: item.identifier, productId: item.platform_product_identifier }]
      : []
  ));
  if (!packages.length) throw new Error('RevenueCat offering has no packages.');

  const ids = packages.map((item) => `id=${encodeURIComponent(item.productId)}`).join('&');
  const productsResponse = await fetchImpl(`${REVENUECAT_API}/rcbilling/v1/subscribers/${user}/products?${ids}&currency=VND`, { headers: headers(apiKey), cache: 'no-store' });
  if (!productsResponse.ok) throw new Error(`RevenueCat products: HTTP ${productsResponse.status}`);
  const products = (await productsResponse.json()) as { product_details?: ProductDetail[] };

  const prices = new Map<string, CardPlanPrice>();
  for (const { packageId, productId } of packages) {
    const product = products.product_details?.find((item) => item.identifier === productId);
    const optionId = product?.default_purchase_option_id;
    const option = typeof optionId === 'string' ? product?.purchase_options?.[optionId] : undefined;
    const first = option?.intro_price?.price ? option.intro_price : option?.base;
    const micros = first?.price?.amount_micros;
    const weeks = momoWeeksForPeriod(parsePeriod(option?.base?.period_duration));
    if (first?.price?.currency !== 'VND' || typeof micros !== 'number' || weeks == null) continue;
    const amount = Math.round(micros / 1_000_000);
    if (Number.isSafeInteger(amount) && amount > 0) prices.set(packageId, { packageId, weeks, amount });
  }
  return prices;
}

/**
 * The price a MoMo pass charges for a card plan of the Vietnamese offering, or null when the offering has no such
 * package in VND. Throws when RevenueCat cannot be read.
 */
export async function cardPlanPrice(packageId: string, fetchImpl: Fetch = fetch, now = Date.now()): Promise<CardPlanPrice | null> {
  const apiKey = process.env.NEXT_PUBLIC_REVENUECAT_WEB_API_KEY?.trim();
  const offeringId = process.env.NEXT_PUBLIC_REVENUECAT_WEB_OFFERING_ID?.trim();
  if (!apiKey || !offeringId) throw new Error('RevenueCat web config is missing.');
  const key = `${apiKey}|${offeringId}`;
  // A package missing from the cache reloads once the cache is half a minute old, in case the offering changed.
  let current = cache;
  const stale = !current || current.key !== key || now - current.at > CACHE_MS || (!current.prices.has(packageId) && now - current.at > 30_000);
  if (!current || stale) {
    current = { key, at: now, prices: await loadPrices(fetchImpl, apiKey, offeringId) };
    cache = current;
  }
  return current.prices.get(packageId) ?? null;
}

/** Test hook: forget the cached prices. */
export function resetCardPlanPrices(): void {
  cache = null;
}
