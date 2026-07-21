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
        'group relative min-h-12 w-full overflow-hidden rounded-2xl p-px text-lg font-semibold text-white shadow-[0_18px_40px_rgb(41_182_161_/_0.22)] outline-none transition focus:ring-4 focus:ring-teal-brand/20 disabled:cursor-not-allowed disabled:opacity-45',
        className,
      )}
    >
      <span className="absolute inset-[-120%] bg-[conic-gradient(from_90deg_at_50%_50%,transparent_0deg,#29b6a1_80deg,#9ef6df_135deg,transparent_210deg)] opacity-80 transition duration-500 group-hover:rotate-180" />
      <span className="relative flex min-h-12 items-center justify-center rounded-[calc(1rem-1px)] bg-forest-dark px-6 py-4 transition group-hover:bg-emerald-deep">
        {children}
      </span>
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
        'group relative min-h-12 w-full overflow-hidden rounded-2xl p-px text-lg font-semibold text-white shadow-[0_18px_40px_rgb(41_182_161_/_0.22)] outline-none transition focus:ring-4 focus:ring-teal-brand/20',
        className,
      )}
    >
      <span className="absolute inset-[-120%] bg-[conic-gradient(from_90deg_at_50%_50%,transparent_0deg,#29b6a1_80deg,#9ef6df_135deg,transparent_210deg)] opacity-80 transition duration-500 group-hover:rotate-180" />
      <span className="relative flex min-h-12 items-center justify-center rounded-[calc(1rem-1px)] bg-forest-dark px-6 py-4 transition group-hover:bg-emerald-deep">
        {children}
      </span>
    </Link>
  );
}
