'use client';

import { QRCodeSVG } from 'qrcode.react';
import { useEffect, useState } from 'react';
import { sendFirebaseEmailLinkAfterPurchase } from '@/lib/firebase/email-link';
import { PaymentEmailLinkHandoff } from './payment-email-link-handoff';

interface RevenueCatRedemptionHandoffProps {
  email: string;
  redeemUrl: string;
  onClose: () => void;
}

export function RevenueCatRedemptionHandoff({ email, redeemUrl, onClose }: RevenueCatRedemptionHandoffProps) {
  const [emailLinkSent, setEmailLinkSent] = useState(false);
  const [emailLinkError, setEmailLinkError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void sendFirebaseEmailLinkAfterPurchase(email)
      .then(() => {
        if (active) setEmailLinkSent(true);
      })
      .catch(() => {
        if (active) setEmailLinkError('We could not send the sign-in email yet. You can still activate Premium by opening Nutree from this secure redemption step.');
      });
    return () => { active = false; };
  }, [email]);

  return (
    <div className="fixed inset-0 z-[80] overflow-y-auto bg-[#111816]/60 px-5 py-8 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="redemption-title">
      <section className="mx-auto flex min-h-full w-full max-w-md items-center">
        <div className="w-full rounded-[2rem] bg-white p-6 text-center shadow-[0_28px_80px_rgb(10_18_16_/_0.34)] sm:p-8">
          <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-teal-brand">Payment confirmed</p>
          <h2 id="redemption-title" className="mt-3 text-3xl font-extrabold tracking-[-0.045em] text-forest">Activate Premium in Nutree</h2>
          <PaymentEmailLinkHandoff emailLinkSent={emailLinkSent} />
          {emailLinkError && <p role="alert" className="mt-3 text-sm font-bold leading-relaxed text-error-brand">{emailLinkError}</p>}
          <p className="mt-5 text-sm font-medium leading-relaxed text-muted-brand">Open Nutree on this phone, or scan this code from the phone where Nutree is installed. The app securely redeems this one-time link and confirms access there.</p>
          <div className="mx-auto mt-6 w-fit rounded-2xl border border-border-brand bg-white p-3 shadow-sm">
            <QRCodeSVG value={redeemUrl} size={188} level="M" includeMargin aria-label="Scan to activate Nutree Premium" />
          </div>
          <button type="button" onClick={() => window.location.assign(redeemUrl)} className="mt-6 min-h-14 w-full rounded-2xl bg-forest px-5 text-base font-extrabold text-white transition hover:bg-emerald-deep focus:outline-none focus-visible:ring-4 focus-visible:ring-teal-brand/25">Open Nutree and activate</button>
          <button type="button" onClick={onClose} className="mt-3 min-h-11 w-full text-sm font-bold text-muted-brand underline underline-offset-4">I’ll finish this later</button>
        </div>
      </section>
    </div>
  );
}
