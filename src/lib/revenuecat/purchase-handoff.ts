import {
  redemptionLinkHash,
  redemptionUrlFromCheckoutOperation,
  savePendingRedemptionCorrelation,
} from './redemption-handoff';

let handoffInFlight = false;

/** True while the purchase handler still owns the redemption handoff. */
export function isPurchaseHandoffInFlight(): boolean {
  return handoffInFlight;
}

export function beginPurchaseHandoff(): void {
  handoffInFlight = true;
}

export function endPurchaseHandoff(): void {
  handoffInFlight = false;
}

/**
 * Hash the redemption link, store the pending correlation, then run the
 * RevenueCat correlation. Navigation belongs to the caller, after this
 * resolves or hits the existing failure path.
 */
export async function settlePurchaseRedemption(input: {
  redeemUrl: string | null | undefined;
  operationSessionId: string | undefined;
  apiKey: string;
  leadId: string;
  appUserId: string;
}): Promise<{ hash: string | null }> {
  const redeemUrl = input.redeemUrl
    ?? await redemptionUrlFromCheckoutOperation(input.apiKey, input.operationSessionId ?? '');
  const hash = await redemptionLinkHash(redeemUrl);
  if (!hash) return { hash: null };
  savePendingRedemptionCorrelation({
    leadId: input.leadId,
    appUserId: input.appUserId,
    redemptionLinkHash: hash,
  });
  return { hash };
}

/**
 * Keeps the document alive until the handoff has finished or failed, then navigates.
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
}): Promise<void> {
  beginPurchaseHandoff();
  try {
    input.markPurchased();
    try {
      const { hash } = await settlePurchaseRedemption(input);
      if (!hash) {
        input.onRecovery();
        return;
      }
      input.onPending(hash);
      try {
        await input.correlate(hash);
      } catch {
        // A completed payment stays purchased. Post-checkout retries the correlation.
      }
    } catch {
      input.onRecovery();
    }
  } finally {
    try {
      input.navigate();
    } finally {
      endPurchaseHandoff();
    }
  }
}
