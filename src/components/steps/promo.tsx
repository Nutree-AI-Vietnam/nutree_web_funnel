'use client';

import { useRouter } from 'next/navigation';
import { PrimaryButton } from '@/components/primary-button';
import { vi } from '@/lib/copy/vi';
import { nextRoute, type QuizStep } from '@/lib/quiz/steps';
import { cn } from '@/lib/utils';

function PromoIcon({ variant }: { variant: 'science' | 'macro' | 'meals' }) {
  const colors = {
    science: ['#29b6a1', '#1a4739'],
    macro: ['#d97706', '#0d9488'],
    meals: ['#1a4739', '#29b6a1'],
  }[variant];

  return (
    <div className="relative mb-5 flex h-20 w-20 items-center justify-center rounded-[1.75rem] bg-white shadow-[0_18px_45px_rgb(26_71_57_/_0.14)]">
      <div className="absolute inset-2 rounded-[1.35rem] bg-mist" />
      <svg className="relative h-14 w-14" viewBox="0 0 64 64" role="img" aria-label="">
        <circle cx="32" cy="32" r="25" fill="none" stroke={colors[0]} strokeWidth="2" opacity="0.25" />
        {variant === 'science' && (
          <>
            <path className="promo-draw" d="M25 12v18L15 48c-1 2 1 4 3 4h28c2 0 4-2 3-4L39 30V12" fill="none" stroke={colors[1]} strokeWidth="4" strokeLinecap="round" />
            <path d="M22 40h20" stroke={colors[0]} strokeWidth="4" strokeLinecap="round" />
            <circle className="promo-pulse-dot" cx="30" cy="35" r="3" fill={colors[0]} />
          </>
        )}
        {variant === 'macro' && (
          <>
            <path className="promo-draw" d="M14 44c9-20 23-28 36-26-1 15-10 26-27 32" fill="none" stroke={colors[1]} strokeWidth="4" strokeLinecap="round" />
            <path d="M22 43c7-6 14-12 24-20" stroke={colors[0]} strokeWidth="4" strokeLinecap="round" />
            <circle className="promo-pulse-dot" cx="20" cy="43" r="4" fill={colors[0]} />
          </>
        )}
        {variant === 'meals' && (
          <>
            <rect className="promo-draw" x="16" y="18" width="32" height="28" rx="10" fill="none" stroke={colors[1]} strokeWidth="4" />
            <path d="M24 32h16M28 40h8" stroke={colors[0]} strokeWidth="4" strokeLinecap="round" />
            <circle className="promo-pulse-dot" cx="44" cy="20" r="4" fill={colors[0]} />
          </>
        )}
      </svg>
    </div>
  );
}

export function PromoStep({
  step,
  headline,
  body,
  variant,
  section,
  kicker,
  proof = [],
}: {
  step: QuizStep;
  headline: string;
  body: string;
  variant: 'science' | 'macro' | 'meals';
  section?: string;
  kicker?: string;
  proof?: readonly string[];
}) {
  const router = useRouter();
  return (
    <div className="relative flex flex-1 flex-col justify-center gap-6 overflow-hidden">
      {section && (
        <div aria-hidden="true" className="absolute right-0 top-0 text-[8rem] font-extrabold leading-none text-mist/80">
          {section}
        </div>
      )}
      <div className="relative h-1 w-16 rounded-full bg-teal-brand" />
      <div className="relative">
        <PromoIcon variant={variant} />
        {kicker && <p className="mb-2 text-sm font-bold text-emerald-brand">{kicker}</p>}
        <h1 className="text-3xl font-extrabold leading-tight text-forest">{headline}</h1>
        <p className="mt-3 text-base leading-relaxed text-slate-brand">{body}</p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {proof.map((item) => (
          <div key={item} className={cn('rounded-2xl bg-white/86 p-3 text-center text-sm font-bold text-slate-brand shadow-sm backdrop-blur')}>
            {item}
          </div>
        ))}
      </div>

      <div className="mt-auto pt-4">
        <PrimaryButton onClick={() => router.push(nextRoute(step))}>{vi.common.continue}</PrimaryButton>
      </div>
    </div>
  );
}
