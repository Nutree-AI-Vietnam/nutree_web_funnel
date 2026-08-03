import { isNutreeClaimSiteUrl, siteUrl } from '@/lib/site-url';

export type RedemptionHandoff =
  | { kind: 'pending' }
  | { kind: 'ready'; redeemUrl: string }
  | { kind: 'recovery' };

/** Keeps both bearer-like capabilities out of persistence and web request URLs. */
export function redemptionHandoff({
  correlationAcknowledged,
  redeemUrl,
  preflightToken,
  handoffSiteUrl = siteUrl,
}: {
  correlationAcknowledged: boolean;
  redeemUrl: string | null | undefined;
  preflightToken?: string | null;
  handoffSiteUrl?: string;
}): RedemptionHandoff {
  if (!correlationAcknowledged) return { kind: 'pending' };
  if (!redeemUrl || !preflightToken || !/^[A-Za-z0-9_-]{32,512}$/.test(preflightToken)) return { kind: 'recovery' };
  try {
    const parsed = new URL(redeemUrl);
    const handoffUrl = new URL('/redeem', handoffSiteUrl);
    if (parsed.protocol !== 'https:' || handoffUrl.protocol !== 'https:' || !isNutreeClaimSiteUrl(handoffUrl.origin)) return { kind: 'recovery' };
    handoffUrl.hash = `v=redemption_handoff_v1&redeem_url=${encodeURIComponent(redeemUrl)}&preflight_token=${preflightToken}`;
    return { kind: 'ready', redeemUrl: handoffUrl.toString() };
  } catch {
    return { kind: 'recovery' };
  }
}
