export interface StoredPaywallOffer {
  kind: 'welcome' | 'exit';
  expiresAt: number;
}

export type PaywallPricing =
  | { mode: 'original' }
  | { mode: 'welcome'; expiresAt: number; autoApplied?: boolean }
  | { mode: 'exit'; expiresAt: number };

/**
 * The 50% welcome discount is applied automatically when the paywall opens and
 * runs for `welcomeSeconds`. Once it has expired in this session it stays
 * expired (prices return to the original amount) instead of restarting.
 * The 75% exit offer and checkout abandonment flow are unchanged.
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
    if (stored.kind === 'welcome') return { mode: 'welcome', expiresAt: stored.expiresAt };
  }
  // An expired welcome offer stays expired for the session (UI shows base prices + "offer expired").
  if (stored?.kind === 'welcome') return { mode: 'welcome', expiresAt: stored.expiresAt };
  if (stored?.kind === 'exit') return { mode: 'original' };

  return { mode: 'welcome', expiresAt: input.now + input.welcomeSeconds * 1000, autoApplied: true };
}
