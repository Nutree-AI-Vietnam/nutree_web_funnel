import type { Copy } from '@/lib/copy';
import { formatMomoAmount, MOMO_PLAN_COPY, type MomoPlanKey, type MomoPlanQuote } from '@/lib/payments/momo-checkout';
import { cn } from '@/lib/utils';

interface MomoPlanChoicesProps {
  plans: MomoPlanQuote[];
  value: MomoPlanKey;
  locale: 'vi' | 'en';
  recommendedLabel: string;
  copy: Copy['momoCheckout'];
  onChange: (plan: MomoPlanKey) => void;
}

export function MomoPlanChoices({ plans, value, locale, recommendedLabel, copy, onChange }: MomoPlanChoicesProps) {
  return (
    <>
      {plans.map((quote) => {
        const active = quote.plan === value;
        const planCopy = MOMO_PLAN_COPY[quote.plan];
        return (
          <button
            key={quote.plan}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(quote.plan)}
            className={cn(
              'overflow-hidden rounded-[1.4rem] border-2 bg-white text-left transition focus:outline-none focus-visible:ring-4 focus-visible:ring-teal-brand/20 active:scale-[0.99]',
              active ? 'border-[#ff5b1f] shadow-[0_12px_26px_rgb(255_106_31_/_0.10)]' : 'border-[#dfe7e3] hover:border-teal-brand/60',
            )}
          >
            {planCopy.recommended && <span className="block bg-gradient-to-r from-[#ef4d59] to-[#ff781f] px-3 py-1.5 text-center text-[0.62rem] font-extrabold tracking-[0.02em] text-white">{recommendedLabel}</span>}
            <span className={cn('grid min-h-[5.6rem] grid-cols-[auto_1fr_auto] items-center gap-3 px-3.5 py-3.5', active && 'bg-[#fffafa]')}>
              <span className={cn('grid h-6 w-6 place-items-center rounded-full border-2', active ? 'border-[#111418]' : 'border-[#c8cfcc]')}>{active && <span className="h-3 w-3 rounded-full bg-forest" />}</span>
              <span className="min-w-0">
                <span className={cn('block text-[1rem] font-extrabold leading-tight', active ? 'text-[#111418]' : 'text-[#5f6764]')}>{planCopy.label[locale]}</span>
                <span className="mt-1 block text-[0.76rem] font-semibold leading-snug text-muted-brand">{planCopy.description[locale]}</span>
                <span className="mt-1.5 block text-[0.74rem] font-bold leading-snug text-slate-brand">{copy.oneTime} · {copy.validFor(quote.weeks)}</span>
              </span>
              <span className={cn('min-w-[5.6rem] rounded-[1rem] px-2.5 py-2.5 text-center', active ? 'bg-[#fff1e8] text-[#c2410c]' : 'bg-[#f2f2f1] text-[#111418]')}>
                <span className="block text-[1.05rem] font-extrabold leading-none tracking-[-0.04em] tabular-nums">{formatMomoAmount(quote.amount)}</span>
                {quote.intro && quote.regular_amount > quote.amount && <span className="mt-1.5 block text-[0.62rem] font-bold leading-none tabular-nums line-through opacity-60">{formatMomoAmount(quote.regular_amount)}</span>}
              </span>
            </span>
          </button>
        );
      })}
    </>
  );
}
