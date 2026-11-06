/**
 * Optional marketing cookies for the quiz. Absent or denied means do not load
 * or send Meta, TikTok, GA4, Airbridge, or PostHog. This is a flag on the
 * existing page and the existing event routes, not a new service.
 */

export const OPTIONAL_CONSENT_VERSION = 1;
export const OPTIONAL_CONSENT_COOKIE = 'nutree_optional_cookies';
export const OPTIONAL_CONSENT_STORAGE_KEY = 'nutree_optional_cookies_v1';
export const OPTIONAL_CONSENT_EVENT = 'nutree-optional-consent';

export type OptionalConsentChoice = 'granted' | 'denied';

export function optionalConsentValue(choice: OptionalConsentChoice): string {
  return `${OPTIONAL_CONSENT_VERSION}.${choice}`;
}

export function parseOptionalConsent(value: string | null | undefined): OptionalConsentChoice | null {
  if (!value) return null;
  const [version, choice] = value.split('.');
  if (Number(version) !== OPTIONAL_CONSENT_VERSION || (choice !== 'granted' && choice !== 'denied')) return null;
  return choice;
}

function storage(): Storage | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) return window.localStorage;
    if (typeof localStorage !== 'undefined') return localStorage;
  } catch {
    // Private mode and the Node test runner can hide storage.
  }
  return null;
}

function readCookie(): string | null {
  try {
    if (typeof document === 'undefined') return null;
    const hit = document.cookie.split('; ').find((part) => part.startsWith(`${OPTIONAL_CONSENT_COOKIE}=`));
    return hit ? decodeURIComponent(hit.slice(OPTIONAL_CONSENT_COOKIE.length + 1)) : null;
  } catch {
    return null;
  }
}

/** Granted only when this version was explicitly accepted. Mismatch denies. */
export function readOptionalConsent(): OptionalConsentChoice | null {
  const stored = parseOptionalConsent(storage()?.getItem(OPTIONAL_CONSENT_STORAGE_KEY) ?? null);
  const cookie = parseOptionalConsent(readCookie());
  if (stored && cookie && stored !== cookie) return null;
  return stored ?? cookie;
}

export function hasOptionalConsent(): boolean {
  return readOptionalConsent() === 'granted';
}

export function hasOptionalConsentCookie(value: string | null | undefined): boolean {
  return parseOptionalConsent(value) === 'granted';
}

export function writeOptionalConsent(choice: OptionalConsentChoice): void {
  const value = optionalConsentValue(choice);
  try {
    storage()?.setItem(OPTIONAL_CONSENT_STORAGE_KEY, value);
  } catch {
    // The cookie below is what the server routes read.
  }
  try {
    const secure = typeof location !== 'undefined' && location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = `${OPTIONAL_CONSENT_COOKIE}=${encodeURIComponent(value)}; Path=/; Max-Age=31536000; SameSite=Lax${secure}`;
  } catch {
    // Non-browser tests have no document.
  }
  try {
    window.dispatchEvent(new Event(OPTIONAL_CONSENT_EVENT));
  } catch {
    // The writer already stored the choice.
  }
}

export function subscribeOptionalConsent(onChange: () => void): () => void {
  if (typeof window === 'undefined') return () => undefined;
  window.addEventListener(OPTIONAL_CONSENT_EVENT, onChange);
  return () => window.removeEventListener(OPTIONAL_CONSENT_EVENT, onChange);
}

const MARKETING_COOKIES = ['_fbp', '_fbc', '_ttp'];

/** Drops ad-platform cookies. Quiz and checkout cookies stay. */
export function clearMarketingCookies(): void {
  if (typeof document === 'undefined') return;
  const secure = typeof location !== 'undefined' && location.protocol === 'https:' ? '; Secure' : '';
  for (const name of MARKETING_COOKIES) {
    document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax${secure}`;
  }
}

const HEALTH_KEYS = new Set([
  'height',
  'height_cm',
  'weight',
  'weight_kg',
  'target_weight',
  'target_weight_kg',
  'target_weight_unsure',
  'body_fat',
  'body_fat_percentage',
  'bmi',
  'age',
  'age_group',
  'dob',
  'birth_date',
  'birth_year',
  'birth_month',
  'birth_day',
  'gender',
  'sex',
  'fitness_goal',
  'goal',
  'motivation',
  'answers',
  'quiz_answers',
  'name',
  'email',
  'job_type',
]);

/** Marketing and analytics payloads never carry questionnaire values. */
export function stripHealthFields(params: Record<string, unknown>): Record<string, unknown> {
  const next: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(params)) {
    if (!HEALTH_KEYS.has(key)) next[key] = value;
  }
  return next;
}
