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

/** One checkout-status read, including its body. The retry loop is also bounded by the handoff deadline. */
export const REDEMPTION_LOOKUP_REQUEST_TIMEOUT_MS = 4_000;

function abortable<T>(work: Promise<T>, timeoutMs: number, controller: AbortController): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      controller.abort();
      reject(new DOMException('The operation was aborted.', 'AbortError'));
    }, timeoutMs);
    work.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

function withinDeadline<T>(work: Promise<T>, deadline: number): Promise<T | null> {
  if (!Number.isFinite(deadline)) return work;
  const remaining = deadline - Date.now();
  if (remaining <= 0) return Promise.resolve(null);
  return new Promise((resolve) => {
    let settled = false;
    const finish = (value: T | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(value);
    };
    const timer = setTimeout(() => finish(null), remaining);
    work.then(
      (value) => finish(value),
      () => finish(null),
    );
  });
}

/**
 * RevenueCat may publish the redemption URL just after Paddle reports success.
 * Poll the operation using the public SDK key, without persisting the URL.
 * Each read keeps its timeout armed until the body is parsed. The loop also
 * stops at `deadline`, even if one body never finishes.
 */
export async function redemptionUrlFromCheckoutOperation(
  apiKey: string,
  operationSessionId: string,
  options: {
    fetcher?: typeof fetch;
    attempts?: number;
    delayMs?: number;
    requestTimeoutMs?: number;
    deadline?: number;
  } = {},
): Promise<string | null> {
  if (!apiKey || !operationSessionId) return null;
  const fetcher = options.fetcher ?? fetch;
  const attempts = Math.max(1, options.attempts ?? 8);
  const delayMs = Math.max(0, options.delayMs ?? 1000);
  const requestTimeoutMs = Math.max(1, options.requestTimeoutMs ?? REDEMPTION_LOOKUP_REQUEST_TIMEOUT_MS);
  const deadline = options.deadline ?? Number.POSITIVE_INFINITY;

  return withinDeadline((async () => {
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      if (Date.now() >= deadline) return null;
      if (attempt > 0 && delayMs > 0) {
        const pause = Math.min(delayMs, deadline - Date.now());
        if (pause <= 0) return null;
        await new Promise((resolve) => globalThis.setTimeout(resolve, pause));
        if (Date.now() >= deadline) return null;
      }
      const remaining = deadline - Date.now();
      if (remaining <= 0) return null;
      const controller = new AbortController();
      try {
        const redeemUrl = await abortable((async () => {
          const response = await fetcher(`https://api.revenuecat.com/rcbilling/v1/checkout/${encodeURIComponent(operationSessionId)}`, {
            headers: {
              Accept: 'application/json',
              Authorization: `Bearer ${apiKey}`,
              'X-Platform': 'web',
            },
            signal: controller.signal,
          });
          if (!response.ok) return null;
          const body = await response.json() as CheckoutStatusResponse;
          const nextUrl = body.operation?.redemption_info?.redeem_url;
          return typeof nextUrl === 'string' && URL.canParse(nextUrl) ? nextUrl : null;
        })(), Math.min(requestTimeoutMs, remaining), controller);
        if (redeemUrl) return redeemUrl;
      } catch {
        controller.abort();
        // A provider read is best-effort; the next attempt, or the deadline, decides.
      }
    }
    return null;
  })(), deadline);
}

/** Keeps redemption capabilities out of persistence, routing state, and UI output. */
export function redemptionHandoff({ correlationAcknowledged, redemptionLinkHash }: { correlationAcknowledged: boolean; redemptionLinkHash: string | null | undefined }): RedemptionHandoff {
  if (!correlationAcknowledged) return { kind: 'pending' };
  return redemptionLinkHash ? { kind: 'email_sent' } : { kind: 'recovery' };
}
