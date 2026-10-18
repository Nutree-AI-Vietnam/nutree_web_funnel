import Image from 'next/image';
import { cn } from '@/lib/utils';

/** The rounded app icon used in screen headers and care illustrations. */
export function NutreeLogo({
  className,
  alt = '',
  priority = false,
}: {
  className?: string;
  alt?: string;
  priority?: boolean;
}) {
  return (
    <Image
      src="/nutree-logo-rounded.png"
      alt={alt}
      width={1024}
      height={1024}
      priority={priority}
      className={cn('aspect-square rounded-[22%] object-cover', className)}
    />
  );
}
