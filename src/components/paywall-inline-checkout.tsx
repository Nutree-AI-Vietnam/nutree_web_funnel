'use client';

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

          <div className="mt-4 min-w-[312px]" ref={checkoutTargetRef} aria-label={isVietnamese ? 'Biểu mẫu thanh toán Paddle' : 'Paddle payment form'} />
        </main>
      </div>
    </div>
  );
}
