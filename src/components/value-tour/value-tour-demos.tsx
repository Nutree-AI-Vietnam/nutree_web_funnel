'use client';

import Image from 'next/image';
import { useReducedMotion } from 'motion/react';
import type { Locale } from '@/lib/copy';
import { useLocale } from '@/lib/copy/use-copy';

/** A modern iPhone shell. Height is capped so the bezel, title, and button still fit a phone viewport. */
function IphoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative mx-auto aspect-[9/19.5] h-[min(34rem,58dvh)] max-w-full rounded-[2.4rem] bg-[#14161a] p-[0.4rem] shadow-[0_22px_50px_rgb(26_71_57_/_0.2)]">
      <div className="relative h-full overflow-hidden rounded-[2rem] bg-[#f3f6f2]">
        {children}
        <div aria-hidden className="pointer-events-none absolute left-1/2 top-[0.42rem] z-10 h-[1.15rem] w-[4.4rem] -translate-x-1/2 rounded-full bg-black" />
      </div>
    </div>
  );
}

const SCREEN_MEDIA = 'h-full w-full object-cover';

export function GuideDemo({ points }: { points: readonly string[] }) {
  return (
    <ol className="space-y-3">
      {points.map((point, index) => (
        <li key={point} className="flex items-center gap-3 rounded-2xl bg-white/80 px-4 py-3 shadow-[0_10px_30px_rgb(26_71_57_/_0.06)]">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-forest text-sm font-extrabold text-white">{index + 1}</span>
          <span className="text-sm font-semibold leading-5 text-forest">{point}</span>
        </li>
      ))}
    </ol>
  );
}

/** The meal-scan clip from the mobile onboarding promo, in an iPhone frame. */
export function MealSnapDemo({ label }: { label: string }) {
  const reduce = useReducedMotion();

  return (
    <IphoneFrame>
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

const REFERENCE_LOGOS: Record<string, string> = {
  WHO: '/images/source-who.webp',
  UNICEF: '/images/source-unicef.webp',
  NIH: '/images/source-nih.svg',
  EFSA: '/images/source-efsa.webp',
};

/** The TDEE, BMI, and macro explanation from the earlier How Nutree works screen. */
export function HowItWorksList({ items }: { items: readonly { title: string; body: string; icon: string }[] }) {
  return (
    <ul className="space-y-3">
      {items.map((item, index) => (
        <li key={item.title} className="flex items-start gap-3 rounded-2xl bg-white/85 px-4 py-3 shadow-[0_10px_30px_rgb(26_71_57_/_0.06)]">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-forest text-sm font-extrabold text-white">{index + 1}</span>
          <span>
            <span className="block text-sm font-extrabold leading-5 text-forest">{item.title}</span>
            <span className="mt-1 block text-xs font-semibold leading-relaxed text-slate-brand">{item.body}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

/** The public-nutrition sources from the earlier How Nutree works section. */
export function ReferenceSources({ sources }: { sources: readonly { acronym: string; name: string; detail: string; href: string }[] }) {
  return (
    <div className="divide-y divide-border-brand/70 overflow-hidden rounded-2xl border border-border-brand/70 bg-white/80">
      {sources.map((source) => (
        <a
          key={source.acronym}
          href={source.href}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-3 px-3 py-2 transition hover:bg-mist focus:outline-none focus-visible:ring-4 focus-visible:ring-teal-brand/20"
        >
          <span className="grid h-10 w-14 shrink-0 place-items-center">
            <Image src={REFERENCE_LOGOS[source.acronym]} alt="" width={56} height={40} className="max-h-9 w-full object-contain" />
          </span>
          <span className="min-w-0">
            <span className="block text-xs font-extrabold text-forest">{source.name}</span>
            <span className="mt-0.5 block text-sm font-semibold leading-snug text-muted-brand">{source.detail}</span>
          </span>
        </a>
      ))}
    </div>
  );
}

/** The nutrition-data logos mobile scrolls above the science collage. */
export function ScienceSourceLogos({ sources, label }: { sources: readonly { name: string; image: string }[]; label: string }) {
  return (
    <ul aria-label={label} className="flex items-center gap-6 overflow-x-auto py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {sources.map((source) => (
        <li key={source.image} className="shrink-0">
          <Image src={source.image} alt={source.name} width={180} height={32} className="h-8 w-auto max-w-[11rem] object-contain" />
        </li>
      ))}
    </ul>
  );
}

/** The three science cards mobile floats over the TDEE promo, in the visitor's language. */
export function ScienceCollage({ locale, label }: { locale: Locale; label: string }) {
  const folder = locale === 'vi' ? 'vi' : 'en';
  const cards = [
    { file: 'science_bmr.png', className: 'left-0 top-8 w-[48%] -rotate-6' },
    { file: 'science_issn.png', className: 'right-0 top-10 w-[48%] rotate-3' },
    { file: 'science_chart.png', className: 'left-1/2 top-0 z-10 w-[58%] -translate-x-1/2' },
  ];

  return (
    <div className="relative mx-auto h-44 w-full max-w-[22rem]" role="img" aria-label={label}>
      {cards.map((card) => (
        <div key={card.file} className={`absolute overflow-hidden rounded-2xl bg-white shadow-[0_16px_40px_rgb(26_71_57_/_0.16)] ${card.className}`}>
          <Image src={`/value-tour/science/${folder}/${card.file}`} alt="" width={640} height={360} className="h-28 w-full object-cover object-top" />
        </div>
      ))}
    </div>
  );
}

const MACRO_CALORIES = [1880, 1880, 1880, 1730, 1730, 1730, 1730] as const;

/** Weekly calories ease after midweek. Heights keep the 1,880 to 1,730 step readable. */
export function MacroDemo({ alt, days }: { alt: string; days: readonly string[] }) {
  const locale = useLocale();
  const format = new Intl.NumberFormat(locale === 'vi' ? 'vi-VN' : 'en-US');

  return (
    <figure aria-label={alt} className="mx-auto w-full max-w-[22rem]">
      <div className="flex h-[min(22rem,42dvh)] items-stretch gap-1.5">
        {MACRO_CALORIES.map((calories, index) => (
          <div key={days[index] ?? index} className="flex min-w-0 flex-1 flex-col">
            <p className="text-center text-[0.7rem] font-bold tracking-tight text-forest">{format.format(calories)}</p>
            <div className="relative mt-2 min-h-0 flex-1">
              <div
                className="absolute inset-x-0 bottom-0 mx-auto w-full max-w-11 rounded-full bg-[linear-gradient(180deg,#d7f6ec_0%,#7edcc4_34%,#1fa892_100%)]"
                style={{ height: calories === 1880 ? '100%' : '86%' }}
              />
            </div>
            <p className={`mt-2 text-center text-[11px] font-semibold leading-none ${index === 2 ? 'text-gold' : 'text-muted-brand'}`}>{days[index]}</p>
          </div>
        ))}
      </div>
    </figure>
  );
}

export function MealCardsDemo({ cards }: { cards: readonly { title: string; meta: string; image: string }[] }) {
  return (
    <ul className="flex flex-col gap-2.5">
      {cards.map((card) => (
        <li key={card.image} className="flex items-center gap-3 rounded-2xl bg-white p-2 shadow-[0_10px_30px_rgb(26_71_57_/_0.06)]">
          <Image src={card.image} alt={card.title} width={128} height={128} className="h-16 w-16 shrink-0 rounded-xl object-cover" />
          <div className="min-w-0">
            <h3 className="text-[15px] font-extrabold leading-5 text-forest">{card.title}</h3>
            <p className="mt-0.5 text-sm font-semibold text-muted-brand">{card.meta}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

/** The workout picker screenshot, inside the same iPhone frame. */
export function ActivityDemo({ src, alt }: { src: string; alt: string }) {
  return (
    <IphoneFrame>
      <Image src={src} alt={alt} width={1179} height={2556} className={SCREEN_MEDIA} />
    </IphoneFrame>
  );
}
