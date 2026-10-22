import { isValidEmail } from '@/lib/quiz/email';

const CHECKOUT_EMAIL_STORAGE_KEY = 'nutree.checkout.email.v1';
const CHECKOUT_METHOD_STORAGE_KEY = 'nutree.checkout.method.v1';

function storage() {
  if (typeof window === 'undefined') return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

/** Session-only convenience for RevenueCat customerEmail. Lead email remains ownership authority. */
export function saveCheckoutEmail(email: string) {
  const normalized = email.trim().toLowerCase();
  if (!isValidEmail(normalized)) return;
  storage()?.setItem(CHECKOUT_EMAIL_STORAGE_KEY, normalized);
}

export function readCheckoutEmail(): string | null {
  const value = storage()?.getItem(CHECKOUT_EMAIL_STORAGE_KEY)?.trim().toLowerCase() ?? null;
  return value && isValidEmail(value) ? value : null;
}

export function clearCheckoutEmail() {
  storage()?.removeItem(CHECKOUT_EMAIL_STORAGE_KEY);
}

/**
 * Which provider the last checkout used, so post-checkout copy matches it.
 * Card checkouts record `paddle` when they start; MoMo records `momo` only
 * once the backend confirms a paid order (the return page) or a paid lead
 * (the paywall). Nothing clears it: a started MoMo checkout writes nothing,
 * so there is no stale MoMo value to remove.
 */
export function rememberCheckoutMethod(method: 'momo' | 'paddle') {
  storage()?.setItem(CHECKOUT_METHOD_STORAGE_KEY, method);
}

export function readCheckoutMethod(): 'momo' | 'paddle' | null {
  const value = storage()?.getItem(CHECKOUT_METHOD_STORAGE_KEY);
  return value === 'momo' || value === 'paddle' ? value : null;
}
