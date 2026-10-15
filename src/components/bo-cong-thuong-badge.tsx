import Image from 'next/image';
import { cn } from '@/lib/utils';

const NOTICE_HREF = 'https://online.gov.vn/nen-tang/8827acb5-d544-4881-8984-e67248f540d3';
const IMAGE_WIDTH = 230;
const IMAGE_HEIGHT = 86;

/** Official Bộ Công Thương e-commerce notice. Opens the public listing. */
export function BoCongThuongBadge({
  alt,
  className,
  height = 52,
}: {
  alt: string;
  className?: string;
  height?: number;
}) {
  const width = Math.round((IMAGE_WIDTH / IMAGE_HEIGHT) * height);

  return (
    <a
      href={NOTICE_HREF}
      target="_blank"
      rel="noopener noreferrer"
      title={alt}
      className={cn(
        'inline-flex shrink-0 rounded-md transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-brand focus-visible:ring-offset-2',
        className,
      )}
    >
      <Image src="/badges/da-thong-bao.png" alt={alt} width={width} height={height} />
    </a>
  );
}
