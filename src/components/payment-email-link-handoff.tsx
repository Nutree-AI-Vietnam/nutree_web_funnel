interface PaymentEmailLinkHandoffProps {
  emailLinkSent: boolean;
}

export function PaymentEmailLinkHandoff({ emailLinkSent }: PaymentEmailLinkHandoffProps) {
  const message = emailLinkSent
    ? 'Your secure Nutree sign-in email is on its way. Open it on your phone to sign in, then use the redemption link below to activate Premium.'
    : 'Your payment is confirmed. We are preparing your secure Nutree sign-in email.';

  return <p className="mt-5 text-base font-semibold leading-relaxed text-slate-brand" role="status">{message}</p>;
}
