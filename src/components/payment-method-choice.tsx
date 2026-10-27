import { MomoLogo } from '@/components/momo-logo';
import { Icon } from '@/components/ui/icons';
import type { Copy } from '@/lib/copy';
import { cn } from '@/lib/utils';

/** How a Vietnamese buyer pays in the checkout sheet: MoMo's wallet or ATM page, or Paddle's card form. */
export type CheckoutPaymentMethod = 'wallet' | 'atm' | 'card';

interface PaymentMethodChoiceProps {
  value: CheckoutPaymentMethod;
  copy: Copy['momoCheckout'];
  /** True while a MoMo order is being created, so the method on screen is the one charged. */
  disabled?: boolean;
  onChange: (method: CheckoutPaymentMethod) => void;
}

/** One list of the three ways to pay, as radio rows inside the checkout sheet. */
export function PaymentMethodChoice({ value, copy, disabled = false, onChange }: PaymentMethodChoiceProps) {
  const options = [
    { id: 'wallet' as const, label: copy.wallet, hint: copy.walletHint },
    { id: 'atm' as const, label: copy.atm, hint: copy.atmHint },
    { id: 'card' as const, label: copy.cardLabel, hint: copy.cardHint },
  ];
  return (
    <div role="radiogroup" aria-label={copy.methodLabel} className="mt-3 overflow-hidden rounded-[1.25rem] border border-black/[0.06] bg-white">
      {options.map((option, index) => {
        const selected = option.id === value;
        return (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={disabled}
            onClick={() => onChange(option.id)}
            className={cn(
              'flex min-h-[4.25rem] w-full items-center gap-3 px-3.5 py-2.5 text-left transition focus:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-teal-brand/25 disabled:cursor-not-allowed disabled:opacity-60',
              index > 0 && 'border-t border-black/[0.06]',
              selected && 'bg-[#f3faf6]',
            )}
          >
            {option.id === 'card'
              ? <span aria-hidden="true" className="grid h-8 w-8 shrink-0 place-items-center rounded-[22%] bg-mist text-forest"><Icon name="card" className="h-4.5 w-4.5" /></span>
              : <MomoLogo size={32} />}
            <span className="min-w-0 flex-1">
              <span className="block text-[0.95rem] font-extrabold leading-tight text-charcoal">{option.label}</span>
              <span className="mt-0.5 block text-[0.74rem] font-semibold leading-snug text-muted-brand">{option.hint}</span>
            </span>
            <span aria-hidden="true" className={cn('grid h-5 w-5 shrink-0 place-items-center rounded-full border-2', selected ? 'border-forest' : 'border-[#c8cfcc]')}>
              {selected && <span className="h-2.5 w-2.5 rounded-full bg-forest" />}
            </span>
          </button>
        );
      })}
    </div>
  );
}
