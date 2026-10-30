'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { RedemptionEmailPreview } from '@/components/redemption-email-guide';
import { trackEvent } from '@/lib/analytics/track';
import { SUPPORT_EMAIL } from '@/lib/support';
import { orderedStoreLinks, phoneStoreFromUserAgent } from '@/lib/store-links';
import { correlateRevenueCatCustomer } from '@/lib/api/client';
import { copyFor } from '@/lib/copy';
import { isMomoPostcheckout } from '@/lib/payments/momo-checkout';
import { useHydrated, useQuizStore } from '@/lib/quiz/store';
import { clearCheckoutEmail, readCheckoutMethod } from '@/lib/revenuecat/checkout-email';
import { clearPendingRedemptionCorrelation, readPendingRedemptionCorrelation } from '@/lib/revenuecat/redemption-handoff';
import { retryRedemptionCorrelation } from '@/lib/revenuecat/correlation-retry';

const noSubscribe = () => () => {};

type CorrelationState = 'idle' | 'syncing' | 'sent' | 'retry_exhausted';

export function PostcheckoutPageClient() {
  const hydrated = useHydrated();
  const lead = useQuizStore((state) => state.lead);
  const locale = useQuizStore((state) => state.locale);
  const setLead = useQuizStore((state) => state.setLead);
  const [correlationState, setCorrelationState] = useState<Exclude<CorrelationState, 'syncing'>>('idle');
  const [supportOpen, setSupportOpen] = useState(false);
  const pendingCorrelation = hydrated && lead ? readPendingRedemptionCorrelation() : null;
  const pendingLeadId = pendingCorrelation?.leadId;
  const pendingAppUserId = pendingCorrelation?.appUserId;
  const pendingLinkHash = pendingCorrelation?.redemptionLinkHash;
  const vi = locale === 'vi';
  const redeemCopy = copyFor(vi ? 'vi' : 'en').redeem;
  const momoCopy = copyFor(vi ? 'vi' : 'en').momoCheckout;
  // MoMo passes unlock when the buyer signs in to the app with the checkout email. The return
  // page adds ?method=momo for tabs without the stored method; a pending RevenueCat correlation
  // is a card purchase. The URL is read after hydration so server and client renders match.
  const momoHandoff = hydrated
    && !pendingCorrelation
    && (isMomoPostcheckout(window.location.search) || readCheckoutMethod() === 'momo');

  useEffect(() => {
    if (!hydrated || !lead) return;
    if (pendingLeadId !== lead.lead_id || !pendingAppUserId || !pendingLinkHash) return;

    let cancelled = false;
    void retryRedemptionCorrelation(
      async () => {
        const acknowledgedLead = await correlateRevenueCatCustomer(lead.lead_id, pendingAppUserId, pendingLinkHash);
        if (cancelled) return;
        setLead(acknowledgedLead);
        clearPendingRedemptionCorrelation(lead.lead_id);
        clearCheckoutEmail();
      },
      { isCancelled: () => cancelled },
    ).then((succeeded) => {
      if (cancelled) return;
      setCorrelationState(succeeded ? 'sent' : 'retry_exhausted');
    });

    return () => { cancelled = true; };
  }, [hydrated, lead, pendingAppUserId, pendingLeadId, pendingLinkHash, setLead]);

  const statusMessage = momoHandoff
    ? momoCopy.paidBody
    : pendingCorrelation && correlationState === 'idle'
    ? (vi ? 'Thanh toán đã xong. Đang xác nhận email kích hoạt bảo mật…' : 'Payment is complete. We’re confirming your secure redemption email…')
    : correlationState === 'sent'
      ? (vi ? 'Kiểm tra email bạn đã dùng khi thanh toán để tiếp tục với Nutree.' : 'Check the email you used at checkout to continue with Nutree.')
      : correlationState === 'retry_exhausted'
        ? (vi ? 'Thanh toán đã xong nhưng xác nhận đang chậm hơn dự kiến. Tải lại trang sau; bạn sẽ không bị trừ thêm.' : 'Payment is complete, but confirmation is taking longer than expected. Refresh this page in a moment; you will not be charged again.')
        : (vi ? 'Liên kết trong email sẽ tự đăng nhập và mở kế hoạch trên điện thoại của bạn.' : 'Follow these steps on your phone.');

  const handoff = copyFor(vi ? 'vi' : 'en').funnel.postcheckout;
  // Read on the client only, so the server HTML and the first client render agree.
  const userAgent = useSyncExternalStore(noSubscribe, () => navigator.userAgent, () => '');
  const origin = useSyncExternalStore(noSubscribe, () => window.location.origin, () => '');
  const phone = phoneStoreFromUserAgent(userAgent);
  const openUrl = `${origin}/open-nutree`;

  return (
    <main className="grid min-h-dvh place-items-center bg-[#f6faf7] px-5 py-8 text-charcoal">
      <section className="w-full max-w-xl rounded-[2rem] border border-border-brand bg-white p-6 text-center shadow-[0_24px_70px_rgb(23_69_58_/_0.10)] sm:p-10">
        <p className="text-sm font-extrabold tracking-[0.02em] text-teal-brand">{handoff.eyebrow}</p>
        <h1 className="mt-3 text-[2rem] font-extrabold leading-tight tracking-[-0.045em] text-forest">{momoHandoff ? momoCopy.paidHeadline : handoff.title}</h1>
        <p className="mt-4 text-base font-semibold leading-relaxed text-slate-brand" role="status">{statusMessage}</p>

        {/* /open-nutree walks through the redemption email, which a MoMo pass does not use. */}
        {phone && !momoHandoff && (
          <a href="/open-nutree" onClick={() => trackEvent('postcheckout_open_app_tapped', { platform: phone })} className="mt-6 flex min-h-14 w-full items-center justify-center rounded-2xl bg-forest px-5 text-base font-extrabold text-white shadow-[0_14px_28px_rgb(23_69_58_/_0.22)]">
            {handoff.openApp}
          </a>
        )}

        {/* A MoMo pass unlocks by signing in with the checkout email; there is no redemption email to follow. */}
        {!momoHandoff && (
          <>
            <ol className="mx-auto mt-6 grid max-w-md gap-3 text-left">
              {handoff.steps.map((step, index) => (
                <li key={step} className="grid grid-cols-[2rem_1fr] items-start gap-3">
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-forest text-sm font-extrabold text-white">{index + 1}</span>
                  <span className="pt-1 text-sm font-bold leading-relaxed text-forest">{step}</span>
                </li>
              ))}
            </ol>
            <p className="mx-auto mt-4 max-w-md rounded-2xl bg-[#f6faf7] px-4 py-3 text-sm font-semibold leading-relaxed text-slate-brand">{handoff.linkLimit}</p>
          </>
        )}

        <div className="mt-6">
          <p className="text-sm font-extrabold text-forest">{handoff.installTitle}</p>
          <div className="mt-3 flex flex-wrap justify-center gap-3">
            {orderedStoreLinks(phone).map((store) => (
              <a key={store.label} href={store.href} className={store.primary ? 'rounded-full bg-forest px-5 py-3 text-sm font-extrabold text-white' : 'rounded-full border border-border-brand px-5 py-3 text-sm font-extrabold text-forest'}>
                {store.label}
              </a>
            ))}
          </div>
        </div>

        {!phone && origin && !momoHandoff && (
          <div className="mt-6 flex flex-col items-center">
            <p className="text-sm font-extrabold text-forest">{handoff.qrTitle}</p>
            <div className="mt-3 rounded-2xl border border-border-brand bg-white p-3">
              <QRCodeSVG value={openUrl} size={148} fgColor="#17453a" />
            </div>
          </div>
        )}

        {!momoHandoff && (
          <>
            <p className="mt-8 text-sm font-extrabold text-forest">{handoff.emailPreviewLabel}</p>
            <RedemptionEmailPreview alt={redeemCopy.imageAlt} caption={redeemCopy.imageCaption} locale={vi ? 'vi' : 'en'} />
          </>
        )}

        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <button
            type="button"
            aria-expanded={supportOpen}
            onClick={() => setSupportOpen((open) => !open)}
            className="rounded-full border border-border-brand px-6 py-3 text-sm font-extrabold text-emerald-deep"
          >
            {vi ? 'Cần hỗ trợ?' : 'Need help?'}
          </button>
        </div>
        {supportOpen && (
          <div className="mx-auto mt-4 max-w-md rounded-2xl bg-[#f6faf7] px-4 py-4 text-left text-sm font-semibold leading-relaxed text-slate-brand">
            <p>{momoHandoff
              ? (vi ? 'Mở ứng dụng Nutree và đăng nhập bằng đúng email đã dùng khi thanh toán.' : 'Open the Nutree app and sign in with the same email you used at checkout.')
              : (vi ? 'Chưa thấy email? Kiểm tra thư rác, rồi mở liên kết trên điện thoại.' : 'No email yet? Check spam, then open the link on your phone.')}</p>
            <p className="mt-2">
              {vi ? 'Cần người hỗ trợ? Gửi email tới ' : 'Need a person? Email '}
              <a className="font-extrabold text-forest underline" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
              {vi ? ' hoặc mở ' : ' or open '}
              <a className="font-extrabold text-forest underline" href="https://nutreeai.com/contact" target="_blank" rel="noopener noreferrer">{vi ? 'trang liên hệ' : 'the contact page'}</a>.
            </p>
          </div>
        )}
      </section>
    </main>
  );
}
