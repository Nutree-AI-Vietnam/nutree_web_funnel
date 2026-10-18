export const WELCOME_VOUCHER_CLAIMED_KEY = 'nutree.paywall.welcome-voucher-claimed.v1';

export function hasWelcomeVoucherBeenClaimed(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.sessionStorage.getItem(WELCOME_VOUCHER_CLAIMED_KEY) === '1';
  } catch {
    return false;
  }
}

export function markWelcomeVoucherClaimed(): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(WELCOME_VOUCHER_CLAIMED_KEY, '1');
  } catch {
    // The in-memory paywall offer still applies on this page.
  }
}

/** The voucher interrupts an exit only while no discount is currently applied. */
export function shouldArmExitVoucher(input: {
  discountActive: boolean;
  checkoutOpen: boolean;
  purchased: boolean;
}): boolean {
  return !input.discountActive && !input.checkoutOpen && !input.purchased;
}
