'use client';

import { useEffect, useState } from 'react';
import { RedemptionEmailPreview } from '@/components/redemption-email-guide';
import { correlateRevenueCatCustomer } from '@/lib/api/client';
import { copyFor } from '@/lib/copy';
import { useHydrated, useQuizStore } from '@/lib/quiz/store';
import { clearCheckoutEmail } from '@/lib/revenuecat/checkout-email';
import { clearPendingRedemptionCorrelation, readPendingRedemptionCorrelation } from '@/lib/revenuecat/redemption-handoff';
import { retryRedemptionCorrelation } from '@/lib/revenuecat/correlation-retry';

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

  const statusMessage = pendingCorrelation && correlationState === 'idle'
    ? (vi ? 'Thanh toán đã xong. Đang xác nhận email kích hoạt bảo mật…' : 'Payment is complete. We’re confirming your secure redemption email…')
    : correlationState === 'sent'
      ? (vi ? 'Kiểm tra email bạn đã dùng khi thanh toán để tiếp tục với Nutree.' : 'Check the email you used at checkout to continue with Nutree.')
      : correlationState === 'retry_exhausted'
        ? (vi ? 'Thanh toán đã xong nhưng xác nhận đang chậm hơn dự kiến. Tải lại trang sau; bạn sẽ không bị trừ thêm.' : 'Payment is complete, but confirmation is taking longer than expected. Refresh this page in a moment; you will not be charged again.')
        : (vi ? 'Kiểm tra email thanh toán để lấy liên kết kích hoạt Nutree. Mở trên điện thoại để tự động đăng nhập và kích hoạt gói.' : 'Check your checkout email for the Nutree redemption link. Open it on your phone to sign in and activate your plan automatically.');

  return (
    <main className="grid min-h-dvh place-items-center bg-[#f6faf7] px-5 text-charcoal">
      <section className="w-full max-w-xl rounded-[2rem] border border-border-brand bg-white p-8 text-center shadow-[0_24px_70px_rgb(23_69_58_/_0.10)] sm:p-10">
        <p className="text-sm font-extrabold uppercase tracking-[0.22em] text-teal-brand">{vi ? 'Thanh toán hoàn tất' : 'Payment complete'}</p>
        <h1 className="mt-4 text-4xl font-extrabold tracking-[-0.055em] text-forest">{vi ? 'Kiểm tra email của bạn' : 'Check your email'}</h1>
        <p className="mt-5 text-base font-semibold leading-relaxed text-slate-brand" role="status">{statusMessage}</p>
        <RedemptionEmailPreview alt={redeemCopy.imageAlt} caption={redeemCopy.imageCaption} />
        <p className="mt-4 text-sm font-semibold text-muted-brand">{redeemCopy.installHint}</p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
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
            <p>{vi ? 'Chưa thấy email? Kiểm tra thư rác, rồi mở liên kết trên điện thoại.' : 'No email yet? Check spam, then open the link on your phone.'}</p>
            <p className="mt-2">
              {vi ? 'Cần người hỗ trợ? Gửi email tới ' : 'Need a person? Email '}
              <a className="font-extrabold text-forest underline" href="mailto:nutreeaidev@gmail.com">nutreeaidev@gmail.com</a>
              {vi ? ' hoặc mở ' : ' or open '}
              <a className="font-extrabold text-forest underline" href="https://nutreeai.com/contact" target="_blank" rel="noopener noreferrer">{vi ? 'trang liên hệ' : 'the contact page'}</a>.
            </p>
          </div>
        )}
      </section>
    </main>
  );
}
