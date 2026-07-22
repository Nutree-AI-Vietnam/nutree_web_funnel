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
        'min-h-14 w-full rounded-2xl bg-forest px-5 py-4 text-base font-extrabold text-white shadow-[0_14px_32px_rgb(10_34_27_/_0.18)] transition hover:-translate-y-0.5 hover:bg-forest-dark focus:outline-none focus:ring-4 focus:ring-teal-brand/20 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0',
        className,
      )}
    >
      {children}
    </button>
  );
}
