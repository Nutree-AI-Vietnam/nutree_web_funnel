'use client';

import { cn } from '@/lib/utils';

export function PrimaryButton({
  children,
  onClick,
  disabled,
  type = 'button',
  className,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: 'button' | 'submit';
  className?: string;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'cta-premium group relative min-h-14 w-full overflow-hidden rounded-2xl px-5 py-4 text-base font-extrabold tracking-tight text-white transition-transform duration-300 hover:-translate-y-0.5 focus:outline-none focus-visible:ring-4 focus-visible:ring-teal-brand/30 active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0',
        className,
      )}
    >
      {children}
    </button>
  );
}
