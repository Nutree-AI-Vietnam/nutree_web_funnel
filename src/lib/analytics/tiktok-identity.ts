import { isValidEmail } from '@/lib/quiz/email';
import { SHA256_HEX, sha256Hex } from './events-api';

/**
 * TikTok manual Advanced Matching: SHA-256 of the email and of the lead id,
 * nothing from the quiz. Only the hashes are stored or sent. Keep automatic
 * advanced matching off in Events Manager: quiz forms hold health details.
 */
export const TIKTOK_IDENTITY_STORAGE_KEY = 'nutree_tiktok_identity_v1';

export type TiktokIdentity = {
  /** SHA-256 hex of the trimmed, lowercased email. */
  email: string;
  /** SHA-256 hex of the lead id. */
  external_id?: string;
};

export type TiktokPixel = {
  track: (event: string, params?: Record<string, unknown>, options?: { event_id: string }) => void;
  identify?: (identity: TiktokIdentity) => void;
};

/** Identity last sent to each pixel instance; a page reload creates a new one. */
const identified = new WeakMap<object, string>();

function storage() {
  if (typeof window === 'undefined') return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

export function readTiktokIdentity(): TiktokIdentity | null {
  try {
    const raw = storage()?.getItem(TIKTOK_IDENTITY_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<TiktokIdentity> | null;
    if (typeof parsed?.email !== 'string' || !SHA256_HEX.test(parsed.email)) return null;
    const identity: TiktokIdentity = { email: parsed.email };
    if (typeof parsed.external_id === 'string' && SHA256_HEX.test(parsed.external_id)) identity.external_id = parsed.external_id;
    return identity;
  } catch {
    return null;
  }
}

/** Identifies the pixel before its next event, once per pixel instance and identity. */
export function applyTiktokIdentity(ttq: TiktokPixel | undefined, identity: TiktokIdentity | null): void {
  if (!ttq?.identify || !identity) return;
  const key = `${identity.email}.${identity.external_id ?? ''}`;
  if (identified.get(ttq) === key) return;
  try {
    ttq.identify(identity);
    identified.set(ttq, key);
  } catch {
    // Analytics must never break the funnel.
  }
}

/**
 * Hashes the email and lead id, keeps the hashes for this tab and identifies
 * the pixel. Await it before tracking the event that should carry the match.
 */
export async function identifyTiktokUser(input: { email: string; externalId?: string }): Promise<TiktokIdentity | null> {
  const email = input.email.trim().toLowerCase();
  if (!isValidEmail(email)) return null;
  const externalId = input.externalId?.trim();
  const [emailHash, externalIdHash] = await Promise.all([sha256Hex(email), externalId ? sha256Hex(externalId) : null]);
  if (!emailHash) return null;
  const identity: TiktokIdentity = externalIdHash ? { email: emailHash, external_id: externalIdHash } : { email: emailHash };
  try {
    storage()?.setItem(TIKTOK_IDENTITY_STORAGE_KEY, JSON.stringify(identity));
  } catch {
    // Matching is best-effort; never block the funnel.
  }
  if (typeof window !== 'undefined') applyTiktokIdentity((window as Window & { ttq?: TiktokPixel }).ttq, identity);
  return identity;
}
