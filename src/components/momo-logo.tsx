import Image from 'next/image';
import { cn } from '@/lib/utils';

/** Official MoMo mark, as served on MoMo's own payment gateway. */
export function MomoLogo({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <Image
      src="/payments/momo-logo.png"
      alt="MoMo"
      width={size}
      height={size}
      className={cn('shrink-0 rounded-[22%]', className)}
    />
  );
}
