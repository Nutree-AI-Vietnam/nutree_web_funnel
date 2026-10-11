import { ReservedCustomerAttribute, type Purchases } from '@revenuecat/purchases-js';
import { getAttribution, type Attribution } from '@/lib/analytics/attribution';

/** RevenueCat takes attribute values up to 500 characters. */
const MAX_ATTRIBUTE_LENGTH = 500;

function fits(value: string | undefined): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= MAX_ATTRIBUTE_LENGTH;
}

/**
 * Maps funnel attribution onto RevenueCat's reserved attribution attributes so
 * Charts and customer exports can slice web revenue by source and campaign. The
 * raw utm_* values and click IDs ride along as custom attributes; `utm_medium`
 * has no reserved slot, so it stays custom-only. Values over RevenueCat's
 * 500-character limit are left out, so one long click ID cannot fail the call.
 */
export function revenueCatAttributionAttributes(attribution: Attribution): Record<string, string> {
  const reserved: Array<[ReservedCustomerAttribute, string | undefined]> = [
    [ReservedCustomerAttribute.MediaSource, attribution.utm_source],
    [ReservedCustomerAttribute.Campaign, attribution.utm_campaign],
    [ReservedCustomerAttribute.AdId, attribution.utm_content],
    [ReservedCustomerAttribute.Keyword, attribution.utm_term],
  ];
  const attributes: Record<string, string> = {};
  for (const [key, value] of reserved) if (fits(value)) attributes[key] = value;
  for (const [key, value] of Object.entries(attribution)) if (fits(value)) attributes[key] = value;
  return attributes;
}

/**
 * Best-effort: attaches the stored attribution to the RevenueCat customer before
 * checkout so the purchase, its webhook, and the dashboard carry the source.
 * Never throws, never blocks the purchase.
 */
export async function syncRevenueCatAttribution(
  purchases: Pick<Purchases, 'setAttributes'>,
  attribution: Attribution = getAttribution(),
): Promise<boolean> {
  const attributes = revenueCatAttributionAttributes(attribution);
  if (!Object.keys(attributes).length) return false;
  try {
    await purchases.setAttributes(attributes);
    return true;
  } catch {
    return false;
  }
}
