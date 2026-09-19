export type RedemptionHandoff =
  | { kind: 'pending' }
  | { kind: 'email_sent' }
  | { kind: 'recovery' };

export interface PendingRedemptionCorrelation {
  leadId: string;
  appUserId: string;
  redemptionLinkHash: string;
}

type SessionStorage = Pick<Storage, 'getItem' | 'removeItem' | 'setItem'>;

const pendingCorrelationStorageKey = 'nutree_pending_redemption_correlation_v1';

function validPendingCorrelation(value: unknown): value is PendingRedemptionCorrelation {
  return Boolean(
    value
    && typeof value === 'object'
    && typeof (value as PendingRedemptionCorrelation).leadId === 'string'
    && typeof (value as PendingRedemptionCorrelation).appUserId === 'string'
    && (value as PendingRedemptionCorrelation).appUserId.length > 0
    && typeof (value as PendingRedemptionCorrelation).redemptionLinkHash === 'string'
    && /^[a-f0-9]{64}$/.test((value as PendingRedemptionCorrelation).redemptionLinkHash),
  );
}

function browserSessionStorage(): SessionStorage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

/** Persists the anonymous customer ID and non-secret digest so a reload can safely retry verification. */
export function savePendingRedemptionCorrelation(correlation: PendingRedemptionCorrelation, storage = browserSessionStorage()): void {
  if (!storage || !validPendingCorrelation(correlation)) return;
  try {
    storage.setItem(pendingCorrelationStorageKey, JSON.stringify(correlation));
  } catch {
    // Checkout remains locked for the current page even if browser storage is unavailable.
  }
}

export function readPendingRedemptionCorrelation(storage = browserSessionStorage()): PendingRedemptionCorrelation | null {
  if (!storage) return null;
  try {
    const parsed: unknown = JSON.parse(storage.getItem(pendingCorrelationStorageKey) ?? 'null');
    return validPendingCorrelation(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function clearPendingRedemptionCorrelation(leadId: string, storage = browserSessionStorage()): void {
  if (readPendingRedemptionCorrelation(storage)?.leadId !== leadId) return;
  try {
    storage?.removeItem(pendingCorrelationStorageKey);
  } catch {
    // A failed cleanup cannot expose a completed checkout.
  }
}

function canonicalRedemptionLink(redeemUrl: string): string {
  const parsed = new URL(redeemUrl);
  const nested = parsed.searchParams.get('url');
  return nested && URL.canParse(nested) ? nested : redeemUrl;
}

/** Returns the lowercase SHA-256 digest needed for server-side link correlation. */
export async function redemptionLinkHash(redeemUrl: string | null | undefined): Promise<string | null> {
  if (!redeemUrl || !URL.canParse(redeemUrl)) return null;
  const canonicalLink = canonicalRedemptionLink(redeemUrl);
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonicalLink));
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

interface CheckoutStatusResponse {
  operation?: {
    redemption_info?: { redeem_url?: string | null } | null;
  };
}

/**
 * RevenueCat may publish the redemption URL just after Paddle reports success.
 * Poll the operation using the public SDK key, without persisting the URL.
 */
export async function redemptionUrlFromCheckoutOperation(
  apiKey: string,
  operationSessionId: string,
  options: { fetcher?: typeof fetch; attempts?: number; delayMs?: number } = {},
): Promise<string | null> {
  if (!apiKey || !operationSessionId) return null;
  const fetcher = options.fetcher ?? fetch;
  const attempts = Math.max(1, options.attempts ?? 8);
  const delayMs = Math.max(0, options.delayMs ?? 1000);

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    if (attempt > 0 && delayMs > 0) await new Promise((resolve) => globalThis.setTimeout(resolve, delayMs));
    try {
      const response = await fetcher(`https://api.revenuecat.com/rcbilling/v1/checkout/${encodeURIComponent(operationSessionId)}`, {
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${apiKey}`,
          'X-Platform': 'web',
        },
      });
      if (!response.ok) continue;
      const body = await response.json() as CheckoutStatusResponse;
      const redeemUrl = body.operation?.redemption_info?.redeem_url;
      if (typeof redeemUrl === 'string' && URL.canParse(redeemUrl)) return redeemUrl;
    } catch {
      // A provider read is best-effort; the caller will show the recovery state.
    }
  }
  return null;
}

/** Keeps redemption capabilities out of persistence, routing state, and UI output. */
export function redemptionHandoff({ correlationAcknowledged, redemptionLinkHash }: { correlationAcknowledged: boolean; redemptionLinkHash: string | null | undefined }): RedemptionHandoff {
  if (!correlationAcknowledged) return { kind: 'pending' };
  return redemptionLinkHash ? { kind: 'email_sent' } : { kind: 'recovery' };
}
