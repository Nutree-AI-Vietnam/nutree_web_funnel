'use client';

import { MovingBorderButton } from '@/components/ui/moving-border-button';

export function PrimaryButton({
  children,
  onClick,
  disabled,
  type = 'button',
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: 'button' | 'submit';
}) {
  return (
    <MovingBorderButton
      type={type}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </MovingBorderButton>
  );
}
