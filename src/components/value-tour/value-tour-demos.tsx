'use client';

import Image from 'next/image';
import { useReducedMotion } from 'motion/react';
import { useCopy, useLocale } from '@/lib/copy/use-copy';
import { sampleDay } from '@/lib/quiz/plan-content';
import type { TdeeResult } from '@/lib/quiz/types';
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

/** Meal ideas from the sample day, so they follow the diet answers. */
export function MealIdeas({ title, tdee, diet }: { title: string; tdee: TdeeResult; diet: readonly string[] | undefined }) {
  const copy = useCopy();
  const locale = useLocale();
  const format = new Intl.NumberFormat(locale === 'vi' ? 'vi-VN' : 'en-US');
  return (
    <section className="rounded-[1.4rem] bg-white/90 p-3.5 shadow-[0_10px_30px_rgb(26_71_57_/_0.06)]">
      <h2 className="text-sm font-extrabold text-forest">{title}</h2>
      <ul className="mt-2 grid gap-1.5">
        {sampleDay(tdee.calories, diet).map((row) => (
          <li key={row.meal} className="flex items-center justify-between gap-3 text-sm">
            <span className="min-w-0 font-semibold text-slate-brand">{copy.funnel.plan.dishes[row.dish]}</span>
            <span className="shrink-0 font-extrabold tabular-nums text-forest">{format.format(row.calories)} kcal</span>
          </li>
        ))}
      </ul>
    </section>
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

/** The store rating for this market, with the store named so the number can be checked. */
export function AppStoreRating({ className }: { className?: string }) {
  const copy = useCopy();
  const rating = copy.funnel.rating;
  return (
    <section className={cn('rounded-[1.6rem] bg-white p-5 text-center shadow-[0_18px_46px_rgb(23_69_58_/_0.08)]', className)} aria-label={rating.line}>
      <p className="text-[3rem] font-extrabold leading-none tracking-[-0.04em] text-forest">{rating.value}</p>
      <StarRow value={Number(rating.value)} className="mt-2 text-[1.35rem]" />
      <p className="mt-2 text-sm font-extrabold text-forest">{rating.count}</p>
      <p className="text-xs font-semibold text-muted-brand">{rating.store}</p>
    </section>
  );
}
