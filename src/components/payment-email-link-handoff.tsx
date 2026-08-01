import type { SafePaymentEmailLinkState } from '@/lib/firebase/email-link';

interface PaymentEmailLinkHandoffProps {
  state: SafePaymentEmailLinkState;
}

/**
 * Deliberately renders no send control without a trusted status source. A Paddle
 * client callback or redirect is never enough to claim payment was received.
 */
export function PaymentEmailLinkHandoff({ state }: PaymentEmailLinkHandoffProps) {
  const message = state.kind === 'email_link_sent'
    ? 'Your secure sign-in email has been sent. Open it on this device to continue.'
    : state.kind === 'payment_verified'
      ? 'Your payment is verified. Your secure sign-in email is being prepared.'
      : 'We’re confirming your payment securely. Once it is verified, we’ll send a secure sign-in email to open Nutree.';

  return <p className="mt-5 text-base font-semibold leading-relaxed text-slate-brand" role="status">{message}</p>;
}
