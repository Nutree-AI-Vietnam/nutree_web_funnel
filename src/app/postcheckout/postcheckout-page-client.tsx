'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { correlateRevenueCatCustomer } from '@/lib/api/client';
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
  const pendingCorrelation = hydrated && lead ? readPendingRedemptionCorrelation() : null;
  const pendingLeadId = pendingCorrelation?.leadId;
  const pendingAppUserId = pendingCorrelation?.appUserId;
  const pendingLinkHash = pendingCorrelation?.redemptionLinkHash;
  const vi = locale === 'vi';

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
      ? (vi ? 'Email kích hoạt đã sẵn sàng. Kiểm tra hộp thư thanh toán, rồi mở liên kết trên điện thoại.' : 'Your secure redemption email is ready. Check your checkout inbox, then open the link on your phone.')
      : correlationState === 'retry_exhausted'
        ? (vi ? 'Thanh toán đã xong nhưng xác nhận đang chậm hơn dự kiến. Tải lại trang sau; bạn sẽ không bị trừ thêm.' : 'Payment is complete, but confirmation is taking longer than expected. Refresh this page in a moment; you will not be charged again.')
        : (vi ? 'Kiểm tra email thanh toán để lấy liên kết kích hoạt Nutree. Mở trên điện thoại, rồi đăng nhập passwordless bằng cùng địa chỉ email.' : 'Check your checkout email for the Nutree redemption link. Open it on your phone, then use passwordless sign-in with the same email address.');

  return (
    <main className="grid min-h-dvh place-items-center bg-[#f6faf7] px-5 text-charcoal">
      <section className="w-full max-w-xl rounded-[2rem] border border-border-brand bg-white p-8 text-center shadow-[0_24px_70px_rgb(23_69_58_/_0.10)] sm:p-10">
        <p className="text-sm font-extrabold uppercase tracking-[0.22em] text-teal-brand">{vi ? 'Thanh toán hoàn tất' : 'Payment complete'}</p>
        <h1 className="mt-4 text-4xl font-extrabold tracking-[-0.055em] text-forest">{vi ? 'Gói Nutree của bạn đã sẵn sàng.' : 'Your Nutree plan is ready.'}</h1>
        <p className="mt-5 text-base font-semibold leading-relaxed text-slate-brand" role="status">{statusMessage}</p>
        <ol className="mx-auto mt-7 max-w-md space-y-3 text-left text-sm font-semibold text-slate-brand">
          <li><span className="mr-2 font-extrabold text-forest">1.</span>{vi ? 'Kiểm tra email bạn dùng khi thanh toán.' : 'Check the email you used at checkout.'}</li>
          <li><span className="mr-2 font-extrabold text-forest">2.</span>{vi ? 'Mở liên kết kích hoạt trong Nutree trên điện thoại.' : 'Open the redemption link in Nutree on your phone.'}</li>
          <li><span className="mr-2 font-extrabold text-forest">3.</span>{vi ? 'Đăng nhập passwordless bằng cùng địa chỉ email.' : 'Sign in with the passwordless email link using the same address.'}</li>
        </ol>
        <p className="mt-5 text-xs font-semibold text-muted-brand">{vi ? 'Trang /redeem chỉ hướng dẫn — không kích hoạt gói. Liên kết trong email mới là liên kết kích hoạt.' : 'The /redeem page is guidance only — it does not activate a plan. The emailed redemption link is the activating link.'}</p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/redeem" className="rounded-full bg-forest px-6 py-3 text-sm font-extrabold text-white">{vi ? 'Mở hướng dẫn Nutree' : 'Open Nutree guidance'}</Link>
          <Link href={`/survey/${locale}`} className="rounded-full border border-border-brand px-6 py-3 text-sm font-extrabold text-emerald-deep">{vi ? 'Cần hỗ trợ?' : 'Need help?'}</Link>
        </div>
      </section>
    </main>
  );
}
