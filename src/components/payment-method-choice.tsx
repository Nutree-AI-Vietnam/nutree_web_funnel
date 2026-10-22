import { MomoLogo } from '@/components/momo-logo';
import type { Copy } from '@/lib/copy';
import { cn } from '@/lib/utils';

export type CheckoutPaymentMethod = 'momo' | 'paddle';

interface PaymentMethodChoiceProps {
  value: CheckoutPaymentMethod;
  copy: Copy['momoCheckout'];
  onChange: (method: CheckoutPaymentMethod) => void;
}

export function PaymentMethodChoice({ value, copy, onChange }: PaymentMethodChoiceProps) {
  const options = [
    { id: 'momo' as const, label: 'MoMo', hint: copy.momoHint },
    { id: 'paddle' as const, label: copy.cardLabel, hint: copy.cardHint },
  ];
  return (
    <div role="radiogroup" aria-label={copy.methodLabel} className="mt-5 grid grid-cols-2 gap-2">
      {options.map((option) => {
        const selected = option.id === value;
        return (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.id)}
            className={cn(
              'flex min-h-16 items-center gap-2.5 rounded-2xl border-2 px-3 py-2 text-left transition focus:outline-none focus-visible:ring-4 focus-visible:ring-teal-brand/20',
              selected ? 'border-forest bg-[#f3faf6]' : 'border-[#dfe7e3] bg-white',
            )}
          >
            {option.id === 'momo' && <MomoLogo size={28} />}
            <span className="min-w-0">
              <span className="block text-sm font-extrabold text-forest">{option.label}</span>
              <span className="mt-0.5 block text-[0.7rem] font-semibold leading-snug text-muted-brand">{option.hint}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
