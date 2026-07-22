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
      whileTap={disabled ? undefined : { scale: 0.985 }}
      className={cn(
        'cta-premium group relative min-h-[3.5rem] w-full overflow-hidden rounded-2xl px-6 py-4 text-lg font-extrabold tracking-tight text-white outline-none transition-transform duration-300 hover:-translate-y-0.5 focus-visible:ring-4 focus-visible:ring-teal-brand/30 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0',
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
        'cta-premium group flex min-h-[3.5rem] w-full items-center justify-center gap-2 overflow-hidden rounded-2xl px-6 py-4 text-center text-lg font-extrabold tracking-tight text-white outline-none transition-transform duration-300 hover:-translate-y-0.5 focus-visible:ring-4 focus-visible:ring-teal-brand/30',
        className,
      )}
    >
      <span>{children}</span>
      <span aria-hidden="true" className="transition-transform duration-300 group-hover:translate-x-1">→</span>
    </Link>
  );
}
