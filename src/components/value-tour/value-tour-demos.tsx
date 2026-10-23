'use client';

import Image from 'next/image';
import { useReducedMotion } from 'motion/react';
import { useCopy } from '@/lib/copy/use-copy';
import { cn } from '@/lib/utils';

/** A modern iPhone shell. Height is capped so the bezel, title, and button still fit a phone viewport. */
function IphoneFrame({ children, compact = false }: { children: React.ReactNode; compact?: boolean }) {
  return (
    <div className={cn(
      'relative mx-auto aspect-[9/19.5] max-w-full rounded-[2.4rem] bg-[#14161a] p-[0.4rem] shadow-[0_22px_50px_rgb(26_71_57_/_0.2)]',
      compact ? 'h-[min(22rem,36dvh)]' : 'h-[min(34rem,58dvh)]',
    )}>
      <div className="relative h-full overflow-hidden rounded-[2rem] bg-[#f3f6f2]">
        {children}
        <div aria-hidden className="pointer-events-none absolute left-1/2 top-[0.42rem] z-10 h-[1.15rem] w-[4.4rem] -translate-x-1/2 rounded-full bg-black" />
      </div>
    </div>
  );
}

const SCREEN_MEDIA = 'h-full w-full object-cover';

/** The meal-scan clip from the mobile onboarding promo, in an iPhone frame. */
export function MealSnapDemo({ label, compact = false }: { label: string; compact?: boolean }) {
  const reduce = useReducedMotion();

  return (
    <IphoneFrame compact={compact}>
      {reduce ? (
        <Image src="/value-tour/meal-scan-poster.png" alt={label} width={1178} height={2556} className={SCREEN_MEDIA} />
      ) : (
        <video
          className={SCREEN_MEDIA}
          src="/value-tour/meal-scan-demo.mp4"
          poster="/value-tour/meal-scan-poster.png"
          aria-label={label}
          autoPlay
          muted
          loop
          playsInline
        />
      )}
    </IphoneFrame>
  );
}

/** Five stars filled to the rating, so 4.6 does not read as a full five. */
export function StarRow({ value, className }: { value: number; className?: string }) {
  const filled = Math.max(0, Math.min(5, value)) * 20;
  return (
    <span aria-hidden="true" className={cn('relative inline-block tracking-[0.12em] leading-none', className)}>
      <span className="text-[#e3e7e5]">★★★★★</span>
      <span className="absolute inset-y-0 left-0 overflow-hidden whitespace-nowrap text-[#e7a23a]" style={{ width: `${filled}%` }}>★★★★★</span>
    </span>
  );
}

export const TRUST_AVATAR_IMAGES = ['/images/trust-female.webp', '/images/trust-aiony.webp', '/images/trust-good-faces.webp', '/images/trust-ali.webp', '/images/trust-jurica.webp'] as const;

/** The App Store rating beside the customer count, split by a hairline. */
export function AppStoreRating({ className }: { className?: string }) {
  const copy = useCopy();
  const rating = copy.funnel.rating;
  return (
    <section aria-label={`${rating.line}. ${rating.countValue} ${rating.countLabel}`} className={cn('grid grid-cols-2 border-y border-forest/12 py-4 text-center', className)}>
      <div className="border-r border-forest/12 px-2">
        <p className="flex items-center justify-center gap-1.5" aria-hidden="true">
          <span className="whitespace-nowrap text-[1.7rem] font-extrabold leading-none tracking-[-0.03em] text-forest">{rating.value}</span>
          <StarRow value={Number(rating.value)} className="text-[0.85rem]" />
        </p>
        <p className="mt-1.5 text-[0.8rem] font-semibold leading-snug text-muted-brand" aria-hidden="true">{rating.label}</p>
      </div>
      <div className="px-2" aria-hidden="true">
        <p className="whitespace-nowrap text-[1.7rem] font-extrabold leading-none tracking-[-0.03em] text-forest">{rating.countValue}</p>
        <p className="mt-1.5 flex items-center justify-center gap-1.5 text-[0.8rem] font-semibold leading-snug text-muted-brand">
          <span className="flex -space-x-1.5">
            {TRUST_AVATAR_IMAGES.slice(0, 3).map((src) => (
              <span key={src} className="relative h-5 w-5 overflow-hidden rounded-full border-[1.5px] border-white bg-mist"><Image src={src} alt="" fill sizes="20px" className="object-cover" /></span>
            ))}
          </span>
          {rating.countLabel}
        </p>
      </div>
    </section>
  );
}
