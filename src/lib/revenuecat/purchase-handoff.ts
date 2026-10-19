import {
  redemptionLinkHash,
  redemptionUrlFromCheckoutOperation,
  savePendingRedemptionCorrelation,
} from './redemption-handoff';

/** One RevenueCat status read, or the correlation call, may stall this long. */
export const PURCHASE_CALL_TIMEOUT_MS = 4_000;

/** The whole handoff may stall this long before we leave for post-checkout. */
export const PURCHASE_HANDOFF_TIMEOUT_MS = 10_000;

let handoffInFlight = false;
let postcheckoutRedirectHeld = false;

/** True while the purchase handler still owns the redemption handoff. */
export function isPurchaseHandoffInFlight(): boolean {
  return handoffInFlight;
}

/** Missing redemption hash keeps the paywall recovery state instead of leaving. */
export function isPostcheckoutRedirectHeld(): boolean {
  return postcheckoutRedirectHeld;
}

export function beginPurchaseHandoff(): void {
  handoffInFlight = true;
  postcheckoutRedirectHeld = false;
}

export function endPurchaseHandoff(): void {
  handoffInFlight = false;
}

export function resetPurchaseHandoffState(): void {
  handoffInFlight = false;
  postcheckoutRedirectHeld = false;
}

class PurchaseHandoffTimeout extends Error {
  constructor() {
    super('purchase handoff timed out');
    this.name = 'PurchaseHandoffTimeout';
  }
}

function withTimeout<T>(work: Promise<T>, callTimeoutMs: number, deadline: number): Promise<T> {
  const limit = Math.min(callTimeoutMs, deadline - Date.now());
  if (limit <= 0) return Promise.reject(new PurchaseHandoffTimeout());
  return new Promise((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      reject(new PurchaseHandoffTimeout());
    }, limit);
    work.then(
      (value) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

/**
 * Hash the redemption link and store the pending correlation before any
 * correlation call. A timeout cannot skip that write once the hash exists.
 */
export async function settlePurchaseRedemption(input: {
  redeemUrl: string | null | undefined;
  operationSessionId: string | undefined;
  apiKey: string;
  leadId: string;
  appUserId: string;
  checkoutFetcher?: typeof fetch;
  callTimeoutMs?: number;
  deadline?: number;
}): Promise<{ hash: string | null }> {
  const callTimeoutMs = input.callTimeoutMs ?? PURCHASE_CALL_TIMEOUT_MS;
  const deadline = input.deadline ?? Date.now() + PURCHASE_HANDOFF_TIMEOUT_MS;
  const redeemUrl = input.redeemUrl
    ?? await redemptionUrlFromCheckoutOperation(input.apiKey, input.operationSessionId ?? '', {
      fetcher: input.checkoutFetcher,
      requestTimeoutMs: callTimeoutMs,
      deadline,
    });
  const hash = await withTimeout(redemptionLinkHash(redeemUrl), callTimeoutMs, deadline);
  if (!hash) return { hash: null };
  savePendingRedemptionCorrelation({
    leadId: input.leadId,
    appUserId: input.appUserId,
    redemptionLinkHash: hash,
  });
  return { hash };
}

/**
 * Keeps the document alive until the handoff has finished, failed, or timed out.
 * A missing hash, including a lookup that runs out of time, stays on the paywall
 * recovery state. Correlation still navigates once a hash has been stored.
 * `markPurchased` runs before any await so entitlement state updates immediately.
 */
export async function completePurchasedCheckout(input: {
  markPurchased: () => void;
  redeemUrl: string | null | undefined;
  operationSessionId: string | undefined;
  apiKey: string;
  leadId: string;
  appUserId: string;
  correlate: (hash: string) => Promise<void>;
  onRecovery: () => void;
  onPending: (hash: string) => void;
  navigate: () => void;
  checkoutFetcher?: typeof fetch;
  callTimeoutMs?: number;
  handoffTimeoutMs?: number;
}): Promise<void> {
  const callTimeoutMs = input.callTimeoutMs ?? PURCHASE_CALL_TIMEOUT_MS;
  const deadline = Date.now() + (input.handoffTimeoutMs ?? PURCHASE_HANDOFF_TIMEOUT_MS);
  beginPurchaseHandoff();
  let leaveForPostcheckout = true;
  try {
    input.markPurchased();
    try {
      const { hash } = await settlePurchaseRedemption({ ...input, callTimeoutMs, deadline });
      if (!hash) {
        postcheckoutRedirectHeld = true;
        leaveForPostcheckout = false;
        input.onRecovery();
        return;
      }
      input.onPending(hash);
      try {
        await withTimeout(input.correlate(hash), callTimeoutMs, deadline);
      } catch {
        // A completed payment stays purchased. Post-checkout retries the correlation.
      }
    } catch {
      // No hash was stored. The paywall recovery state is the same outcome as a missing link.
      postcheckoutRedirectHeld = true;
      leaveForPostcheckout = false;
      input.onRecovery();
    }
  } finally {
    try {
      if (leaveForPostcheckout) input.navigate();
    } finally {
      endPurchaseHandoff();
    }
  }
}
