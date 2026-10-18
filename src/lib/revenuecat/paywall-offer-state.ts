export interface StoredPaywallOffer {
  kind: 'welcome' | 'exit';
  expiresAt: number;
}

export type PaywallPricing =
  | { mode: 'original' }
  | { mode: 'welcome'; expiresAt: number }
  | { mode: 'exit'; expiresAt: number };

/**
 * The paywall starts at the original package price. A welcome discount is
 * applied only after the person has claimed the exit voucher. Checkout
 * abandonment still restores the exit discount.
 */
export function resolvePaywallPricing(input: {
  now: number;
  exitOfferMode: boolean;
  unfinishedCheckout: boolean;
  exitClaimed: boolean;
  welcomeClaimed: boolean;
  stored: StoredPaywallOffer | null;
  welcomeSeconds: number;
  exitSeconds: number;
}): PaywallPricing {
  if (input.unfinishedCheckout) {
    return { mode: 'exit', expiresAt: input.now + input.exitSeconds * 1000 };
  }
  if (input.exitOfferMode && !input.exitClaimed) {
    return { mode: 'exit', expiresAt: input.now + input.exitSeconds * 1000 };
  }

  const stored = input.stored;
  if (stored && stored.expiresAt > input.now) {
    if (stored.kind === 'exit') return { mode: 'exit', expiresAt: stored.expiresAt };
    if (stored.kind === 'welcome' && input.welcomeClaimed) return { mode: 'welcome', expiresAt: stored.expiresAt };
  }

  return { mode: 'original' };
}
