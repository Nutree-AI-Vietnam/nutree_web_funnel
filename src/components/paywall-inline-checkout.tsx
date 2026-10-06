'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

interface PaywallInlineCheckoutProps {
  locale: 'vi' | 'en';
  planLabel: string;
  renewalCadence: string;
  discountPercent: number;
  error: string | null;
  checkoutTargetRef: (element: HTMLDivElement | null) => void;
}

interface PaddleWindow extends Window {
  Paddle?: {
    Initialized?: boolean;
    Checkout?: { close: () => void };
  };
  PaddleBillingV1?: {
    Initialized?: boolean;
    Checkout?: { close: () => void };
  };
}

export function closeInlinePaddleCheckout() {
  const paddleWindow = window as PaddleWindow;
  const paddle = paddleWindow.Paddle ?? paddleWindow.PaddleBillingV1;
  if (paddle?.Initialized) paddle.Checkout?.close();
}

export function PaywallInlineCheckout({
  locale,
  planLabel,
  renewalCadence,
  discountPercent,
  error,
  checkoutTargetRef,
}: PaywallInlineCheckoutProps) {
  const isVietnamese = locale === 'vi';
  const targetRef = useRef<HTMLDivElement | null>(null);
  const frameLoadedRef = useRef(false);
  const [formState, setFormState] = useState<'loading' | 'loaded' | 'timeout'>('loading');
  const setTarget = useCallback((element: HTMLDivElement | null) => {
    targetRef.current = element;
    checkoutTargetRef(element);
  }, [checkoutTargetRef]);

  useEffect(() => {
    const target = targetRef.current;
    if (!target) return;

    const handleFrameLoad = (event: Event) => {
      const frame = event.target;
      if (!(frame instanceof HTMLIFrameElement)) return;
      if (!target.contains(frame) && !frame.src.includes('paddle')) return;
      frameLoadedRef.current = true;
      setFormState('loaded');
    };
    document.addEventListener('load', handleFrameLoad, true);

    const timeout = window.setTimeout(() => {
      if (!frameLoadedRef.current) setFormState('timeout');
    }, 30_000);

    return () => {
      document.removeEventListener('load', handleFrameLoad, true);
      window.clearTimeout(timeout);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[70] overflow-y-auto bg-[#f3f7f5]" role="dialog" aria-modal="true" aria-labelledby="inline-checkout-title">
      <div className="mx-auto min-h-full w-full max-w-xl bg-white shadow-xl">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-[#e5ebe8] bg-white/95 px-4 py-3 backdrop-blur">
          <div>
            <h2 id="inline-checkout-title" className="text-lg font-extrabold text-forest">
              {isVietnamese ? 'Xác nhận thanh toán' : 'Review your payment'}
            </h2>
            <p className="text-xs font-medium text-muted-brand">{planLabel}</p>
          </div>
          <button
            type="button"
            onClick={closeInlinePaddleCheckout}
            className="min-h-11 rounded-xl px-3 text-sm font-bold text-forest underline underline-offset-4 focus:outline-none focus-visible:ring-4 focus-visible:ring-teal-brand/25"
          >
            {isVietnamese ? 'Quay lại' : 'Back'}
          </button>
        </header>

        <main className="p-4 sm:p-6">
          <section className="rounded-2xl border border-[#dce8e2] bg-[#f5faf7] p-4" aria-label={isVietnamese ? 'Chi tiết giá' : 'Price details'}>
            <p className="text-sm font-extrabold text-forest">{isVietnamese ? 'Chi tiết giá' : 'Price details'}</p>
            <div className="mt-3 flex items-center justify-between gap-3">
              <span className="font-bold text-[#18221e]">
                {discountPercent > 0
                  ? (isVietnamese ? 'Ưu đãi cho gói đầu tiên' : 'First plan offer')
                  : (isVietnamese ? 'Thanh toán theo giá đầy đủ' : 'Full plan price')}
              </span>
              {discountPercent > 0 && <span className="rounded-lg bg-[#dff3e9] px-2.5 py-1 text-lg font-extrabold text-forest">−{discountPercent}%</span>}
            </div>
            <p className="mt-2 text-sm font-medium text-muted-brand">
              {isVietnamese ? `Từ kỳ tiếp theo, gói gia hạn theo giá đầy đủ · ${renewalCadence}.` : `From the next cycle, the plan renews at full price · ${renewalCadence}.`}
            </p>
            <p className="mt-3 text-xs leading-relaxed text-muted-brand">
              {isVietnamese
                ? 'Paddle hiển thị số tiền chính xác phải trả hôm nay, thuế và giá gia hạn ở biểu mẫu bên dưới trước khi bạn xác nhận.'
                : 'Paddle shows the exact amount due today, tax, and renewal price in the checkout below before you confirm.'}
            </p>
          </section>

          {error && <p role="alert" className="mt-4 rounded-xl bg-[#fff1ed] px-4 py-3 text-sm font-bold text-error-brand">{error}</p>}

          {formState === 'loading' && <p role="status" className="mt-5 flex items-center gap-3 rounded-xl bg-[#f5faf7] px-4 py-4 text-sm font-semibold text-muted-brand">
            <span aria-hidden="true" className="h-5 w-5 animate-spin rounded-full border-2 border-[#b6d3c5] border-t-forest" />
            {isVietnamese ? 'Đang tải biểu mẫu thanh toán bảo mật của Paddle…' : 'Loading Paddle’s secure payment form…'}
          </p>}
          {formState === 'timeout' && <div role="alert" className="mt-5 rounded-xl bg-[#fff1ed] px-4 py-4 text-sm text-error-brand">
            <p className="font-bold">{isVietnamese ? 'Biểu mẫu thanh toán chưa tải được.' : 'The payment form did not load.'}</p>
            <p className="mt-1">{isVietnamese ? 'Hãy kiểm tra kết nối hoặc mở trang bằng Safari/Chrome rồi thử lại.' : 'Check your connection or open this page in Safari/Chrome, then try again.'}</p>
            <button type="button" onClick={() => window.location.reload()} className="mt-3 font-extrabold underline underline-offset-4">
              {isVietnamese ? 'Tải lại trang thanh toán' : 'Reload checkout'}
            </button>
          </div>}
          <div className="mt-4 min-h-[450px] min-w-[312px]" ref={setTarget} aria-label={isVietnamese ? 'Biểu mẫu thanh toán Paddle' : 'Paddle payment form'} />
        </main>
      </div>
    </div>
  );
}
