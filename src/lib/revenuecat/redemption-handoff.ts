export type RedemptionHandoff =
  | { kind: 'pending' }
  | { kind: 'ready'; redeemUrl: string }
  | { kind: 'recovery' };

/** Keeps the bearer-like redemption URL out of persistence and routing state. */
export function redemptionHandoff({ correlationAcknowledged, redeemUrl }: { correlationAcknowledged: boolean; redeemUrl: string | null | undefined }): RedemptionHandoff {
  if (!correlationAcknowledged) return { kind: 'pending' };
  if (!redeemUrl) return { kind: 'recovery' };
  try {
    const parsed = new URL(redeemUrl);
    return parsed.protocol === 'https:' ? { kind: 'ready', redeemUrl } : { kind: 'recovery' };
  } catch {
    return { kind: 'recovery' };
  }
}
