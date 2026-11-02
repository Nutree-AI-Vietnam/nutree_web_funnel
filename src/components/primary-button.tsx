'use client';

import { cn } from '@/lib/utils';
import { forwardRef } from 'react';

export const PrimaryButton = forwardRef<HTMLButtonElement, {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: 'button' | 'submit';
  className?: string;
}>(({
  children,
  onClick,
  disabled,
  type = 'button',
  className,
}, ref) => {
  return (
    <button
      ref={ref}
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        // An iOS filled button: flat fill, 14px corners, 17pt semibold, dims while pressed.
        'group relative min-h-[2.85rem] w-full rounded-[0.875rem] bg-forest px-5 py-3 text-base font-semibold tracking-[-0.01em] text-white transition-opacity duration-150 focus:outline-none focus-visible:ring-4 focus-visible:ring-teal-brand/30 active:opacity-70 disabled:cursor-not-allowed disabled:opacity-40',
        className,
      )}
    >
      {children}
    </button>
  );
});

PrimaryButton.displayName = 'PrimaryButton';
