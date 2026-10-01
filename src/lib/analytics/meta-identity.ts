import { isValidEmail } from '@/lib/quiz/email';

export const META_IDENTITY_STORAGE_KEY = 'nutree_meta_identity_v1';

export interface MetaIdentity {
  em: string;
  external_id?: string;
  fn?: string;
}

type AnyWindow = Window & {
  fbq?: (...args: unknown[]) => void;
};

function storage() {
  if (typeof window === 'undefined') return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

export function metaPixelId(source = process.env.NEXT_PUBLIC_META_PIXEL_ID): string {
  return source?.replace(/\D/g, '') ?? '';
}

export function normalizeMetaEmail(email: string): string | null {
  const value = email.trim().toLowerCase();
  return isValidEmail(value) ? value : null;
}

export function normalizeMetaFirstName(name: string | undefined): string | null {
  const token = name?.trim().split(/\s+/)[0]?.toLowerCase() ?? '';
  const fn = token.replace(/[^\p{L}]/gu, '');
  return fn.length >= 2 ? fn.slice(0, 32) : null;
}

export function readMetaIdentity(): MetaIdentity | null {
  try {
    const raw = storage()?.getItem(META_IDENTITY_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<MetaIdentity>;
    const em = typeof parsed.em === 'string' ? normalizeMetaEmail(parsed.em) : null;
    if (!em) return null;
    const identity: MetaIdentity = { em };
    if (typeof parsed.external_id === 'string' && parsed.external_id.trim()) {
      identity.external_id = parsed.external_id.trim().slice(0, 80);
    }
    const fn = typeof parsed.fn === 'string' ? normalizeMetaFirstName(parsed.fn) : null;
    if (fn) identity.fn = fn;
    return identity;
  } catch {
    return null;
  }
}

export function saveMetaIdentity(identity: MetaIdentity) {
  try {
    storage()?.setItem(META_IDENTITY_STORAGE_KEY, JSON.stringify(identity));
  } catch {
    // Identity is best-effort; never block checkout.
  }
}

/**
 * Manual Advanced Matching for later standard events on this SPA session.
 * Re-init is required after email capture because the first `fbq('init')` has no user data.
 * Do not send quiz health fields (weight, goal, DOB) — email + lead id + first name only.
 */
export function identifyMetaUser(input: { email: string; externalId?: string; firstName?: string }): MetaIdentity | null {
  const em = normalizeMetaEmail(input.email);
  if (!em) return null;
  const identity: MetaIdentity = { em };
  const externalId = input.externalId?.trim();
  if (externalId) identity.external_id = externalId.slice(0, 80);
  const fn = normalizeMetaFirstName(input.firstName);
  if (fn) identity.fn = fn;
  saveMetaIdentity(identity);

  const pixelId = metaPixelId();
  if (pixelId && typeof window !== 'undefined') {
    try {
      (window as AnyWindow).fbq?.('init', pixelId, identity);
    } catch {
      // Analytics must never break the funnel.
    }
  }
  return identity;
}
