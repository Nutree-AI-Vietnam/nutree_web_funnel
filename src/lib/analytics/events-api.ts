/**
 * Checks shared by the server copies of pixel events (TikTok Events API, Meta
 * Conversions API). Identity arrives as SHA-256 hashes only, and page URLs are
 * cut to origin + path.
 */

export const SHA256_HEX = /^[0-9a-f]{64}$/;
/** Event ids we generate. */
export const TOKEN = /^[\w.~-]+$/;
/** Click ids and cookie values are opaque; any visible ASCII, no spaces. */
export const OPAQUE = /^[!-~]+$/;
export const IP = /^[0-9a-fA-F:.]{3,45}$/;

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function text(value: unknown, maxLength: number, pattern?: RegExp): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > maxLength) return undefined;
  return !pattern || pattern.test(trimmed) ? trimmed : undefined;
}

/** Origin + path only: query strings and fragments can carry tokens. */
export function pageUrl(value: unknown): string | undefined {
  const url = text(value, 2048);
  if (!url) return undefined;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? `${parsed.origin}${parsed.pathname}` : undefined;
  } catch {
    return undefined;
  }
}

/** First hop of x-forwarded-for, which Vercel sets to the client address. */
export function clientIp(headers: Headers): string | null {
  const ip = headers.get('x-forwarded-for')?.split(',')[0]?.trim() || headers.get('x-real-ip')?.trim();
  return ip && IP.test(ip) ? ip : null;
}

/** Lowercase hex SHA-256 of the UTF-8 text; null where Web Crypto is unavailable. */
export async function sha256Hex(value: string): Promise<string | null> {
  try {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
    return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
  } catch {
    return null;
  }
}
