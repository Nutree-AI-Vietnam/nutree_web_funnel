'use client';

import { motion } from 'motion/react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export function MovingBorderButton({
  children,
  className,
  disabled,
  type = 'button',
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  type?: 'button' | 'submit';
  onClick?: () => void;
}) {
  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled}
      whileTap={disabled ? undefined : { scale: 0.99 }}
      className={cn(
        'group relative min-h-12 w-full overflow-hidden rounded-2xl bg-forest px-6 py-4 text-lg font-extrabold text-white shadow-[0_14px_32px_rgb(10_34_27_/_0.18)] outline-none transition hover:-translate-y-0.5 hover:bg-forest-dark focus:ring-4 focus:ring-teal-brand/20 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0',
        className,
      )}
    >
      {children}
    </motion.button>
  );
}

export function MovingBorderLink({
  children,
  href,
  className,
}: {
  children: React.ReactNode;
  href: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        'flex min-h-12 w-full items-center justify-center rounded-2xl bg-forest px-6 py-4 text-center text-lg font-extrabold text-white shadow-[0_14px_32px_rgb(10_34_27_/_0.18)] outline-none transition hover:-translate-y-0.5 hover:bg-forest-dark focus:ring-4 focus:ring-teal-brand/20',
        className,
      )}
    >
      {children}
    </Link>
  );
}
