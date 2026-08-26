import { isValidEmail } from '@/lib/quiz/email';

const CHECKOUT_EMAIL_STORAGE_KEY = 'nutree.checkout.email.v1';

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
