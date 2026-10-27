'use client';

import Image from 'next/image';
import { motion, useReducedMotion } from 'motion/react';
import { CountUp } from '@/components/ui/count-up';
import type { Copy } from '@/lib/copy';
import { useCopy, useLocale } from '@/lib/copy/use-copy';
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

/** Five stars filled to the rating, so 4.7 does not read as a full five; with `animate`, they fill once in view. */
export function StarRow({ value, className, animate = false }: { value: number; className?: string; animate?: boolean }) {
  const reduce = useReducedMotion();
  const filled = `${Math.max(0, Math.min(5, value)) * 20}%`;
  return (
    <span aria-hidden="true" className={cn('relative inline-block tracking-[0.12em] leading-none', className)}>
      <span className="text-[#e3e7e5]">★★★★★</span>
      <motion.span
        className="absolute inset-y-0 left-0 overflow-hidden whitespace-nowrap text-[#e7a23a]"
        initial={animate && !reduce ? { width: '0%' } : false}
        whileInView={{ width: filled }}
        viewport={{ once: true }}
        transition={{ delay: 0.5, duration: 0.9, ease: 'easeOut' }}
        style={{ width: filled }}
      >
        ★★★★★
      </motion.span>
    </span>
  );
}

/** Leaves along one laurel branch: a curved stem, each leaf angled up and away from it, outer leaves larger. */
const LAUREL_LEAVES = (() => {
  const p0 = [30, 88];
  const p1 = [2, 50];
  const p2 = [24, 4];
  const point = (t: number) => [0, 1].map((axis) => (1 - t) ** 2 * p0[axis] + 2 * (1 - t) * t * p1[axis] + t ** 2 * p2[axis]);
  const unitTangent = (t: number) => {
    const v = [0, 1].map((axis) => 2 * (1 - t) * (p1[axis] - p0[axis]) + 2 * t * (p2[axis] - p1[axis]));
    const length = Math.hypot(v[0], v[1]);
    return [v[0] / length, v[1] / length];
  };
  const leaf = (t: number, side: 1 | -1, rx: number, ry: number) => {
    const [px, py] = point(t);
    const [tx, ty] = unitTangent(t);
    // Outward normal (to the left of a stem growing upward), then a direction 48° off the stem.
    const [nx, ny] = [ty * side, -tx * side];
    const lean = (48 * Math.PI) / 180;
    const dx = tx * Math.cos(lean) + nx * Math.sin(lean);
    const dy = ty * Math.cos(lean) + ny * Math.sin(lean);
    const rotate = (Math.atan2(dy, dx) * 180) / Math.PI - 90;
    return { t, cx: px + dx * ry * 0.92, cy: py + dy * ry * 0.92, rx, ry, rotate };
  };
  const outer = [0.08, 0.21, 0.34, 0.47, 0.6, 0.73, 0.85].map((t, index) => leaf(t, 1, 3.1 - index * 0.12, 7.4 - index * 0.25));
  const inner = [0.15, 0.28, 0.41, 0.54, 0.67, 0.79].map((t, index) => leaf(t, -1, 2.5 - index * 0.1, 6 - index * 0.2));
  // Grow from the base to the tip.
  return [...outer, ...inner].sort((a, b) => a.t - b.t);
})();

function Laurel({ flip = false }: { flip?: boolean }) {
  const reduce = useReducedMotion();
  return (
    <svg viewBox="-10 -6 50 100" className={cn('h-[5.6rem] w-auto shrink-0 text-gold', flip && '-scale-x-100')} aria-hidden="true">
      <motion.path
        d="M30 88 Q 2 50 24 4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        initial={reduce ? false : { pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
      />
      {LAUREL_LEAVES.map((leaf, index) => (
        <g key={index} transform={`rotate(${leaf.rotate} ${leaf.cx} ${leaf.cy})`}>
          <motion.ellipse
            cx={leaf.cx}
            cy={leaf.cy}
            rx={leaf.rx}
            ry={leaf.ry}
            fill="currentColor"
            style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
            initial={reduce ? false : { scale: 0, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.15 + index * 0.045, type: 'spring', stiffness: 260, damping: 16 }}
          />
        </g>
      ))}
    </svg>
  );
}

export function AppleMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M16.37 12.6c-.02-2.2 1.8-3.26 1.88-3.31-1.03-1.5-2.62-1.7-3.18-1.73-1.35-.14-2.64.8-3.33.8-.69 0-1.74-.78-2.86-.76-1.47.02-2.83.86-3.59 2.17-1.53 2.65-.39 6.58 1.1 8.73.73 1.05 1.6 2.23 2.73 2.19 1.1-.04 1.51-.71 2.84-.71 1.32 0 1.7.71 2.86.69 1.18-.02 1.93-1.07 2.65-2.13.84-1.22 1.18-2.4 1.2-2.46-.03-.01-2.3-.88-2.3-3.48ZM14.2 6.13c.6-.73 1.01-1.75.9-2.76-.87.03-1.92.58-2.54 1.31-.56.64-1.05 1.67-.92 2.66.97.08 1.96-.49 2.56-1.21Z" />
    </svg>
  );
}

export function GooglePlayMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path fill="#00D7FE" d="M3.6 2.3 13.4 12 3.6 21.7c-.37-.2-.6-.6-.6-1.07V3.37c0-.47.23-.87.6-1.07Z" />
      <path fill="#FFCE00" d="m16.8 8.6-3.4 3.4 3.4 3.4 3.83-2.18c.98-.56.98-1.88 0-2.44L16.8 8.6Z" />
      <path fill="#00F076" d="M3.6 2.3c.33-.18.75-.2 1.14.02l12.06 6.28-3.4 3.4L3.6 2.3Z" />
      <path fill="#F83A50" d="M13.4 12l3.4 3.4L4.74 21.68c-.39.22-.81.2-1.14.02L13.4 12Z" />
    </svg>
  );
}

/**
 * The trust card before the plans: the customer count between laurels, then the store ratings.
 * Only confirmed numbers: 40,000+ customers, the 4.7 App Store rating and the 4.8 Google Play rating
 * (copy.funnel.rating.googlePlay; set it to null to show the plain "available on Android" tile instead).
 */
export function TrustCard({ className }: { className?: string }) {
  const copy = useCopy();
  const locale = useLocale();
  const rating = copy.funnel.rating;
  // "40,000+" or "40.000+": count up to the digits, keep the locale grouping and the trailing "+".
  const countNumber = Number(rating.countValue.replace(/[^0-9]/g, ''));
  const countSuffix = rating.countValue.replace(/^[0-9.,\s]+/, '');
  const countFormat = new Intl.NumberFormat(locale === 'vi' ? 'vi-VN' : 'en-US');
  // Google Play shows its rating once the owner adds it to the copy; until then the tile says the app is there.
  const stores = [
    { key: 'app-store', mark: <AppleMark className="h-5 w-5 text-charcoal" />, value: rating.value, label: rating.label },
    rating.googlePlay
      ? { key: 'google-play', mark: <GooglePlayMark className="h-5 w-5" />, value: rating.googlePlay.value, label: rating.googlePlay.label }
      : { key: 'google-play', mark: <GooglePlayMark className="h-5 w-5" />, name: rating.googlePlayListing.name, label: rating.googlePlayListing.label },
  ];
  return (
    <section aria-label={`${rating.countValue} ${rating.chose}. ${rating.line}. ${rating.googlePlay ? `${rating.googlePlay.value}${rating.outOf} ${rating.googlePlay.label}` : `${rating.googlePlayListing.name}: ${rating.googlePlayListing.label}`}`} className={cn('rounded-[1.6rem] bg-white p-5 shadow-[0_6px_16px_rgb(23_69_58_/_0.07)]', className)}>
      <div className="flex items-center justify-center gap-2" aria-hidden="true">
        <Laurel />
        <p className="text-center">
          <CountUp value={countNumber} format={(value) => `${countFormat.format(Math.round(value))}${countSuffix}`} duration={1.4} className="block text-[2.5rem] font-extrabold leading-none tracking-[-0.04em] tabular-nums text-forest" />
          <span className="mt-1.5 block text-[0.95rem] font-bold leading-snug text-slate-brand">{rating.chose}</span>
        </p>
        <Laurel flip />
      </div>
      <div className="mt-4 grid grid-cols-2 divide-x divide-forest/10 rounded-[1.2rem] bg-mist/70 py-3.5" aria-hidden="true">
        {stores.map((store) => (
          <div key={store.key} className="flex flex-col items-center justify-center px-2 text-center">
            <span className="flex h-5 items-center gap-1.5">
              {store.mark}
              {'value' in store && <StarRow value={Number(store.value)} className="text-[0.9rem]" animate />}
            </span>
            {'value' in store
              ? <span className="mt-1.5 text-[1.45rem] font-extrabold leading-none tabular-nums text-forest">{store.value}<span className="text-[0.95rem] text-muted-brand">{rating.outOf}</span></span>
              : <span className="mt-1.5 text-[1.15rem] font-extrabold leading-[1.26] text-forest">{store.name}</span>}
            <span className="mt-1 text-[0.78rem] font-semibold text-muted-brand">{store.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

export const TRUST_AVATAR_IMAGES = ['/images/trust-female.webp', '/images/trust-aiony.webp', '/images/trust-good-faces.webp', '/images/trust-ali.webp', '/images/trust-jurica.webp'] as const;

/** What the store ratings say, for screen readers: "4.7 out of 5 on the App Store, 4.8 out of 5 on Google Play". */
export function storeRatingsLine(rating: Copy['funnel']['rating']): string {
  return rating.googlePlay ? `${rating.line}, ${rating.googlePlay.line}` : rating.line;
}

/**
 * Both store ratings on one line: each store's mark, its stars filled to the score, and the score out of 5.
 * The marks, stars and scores scale with the font size. Hidden from screen readers; say storeRatingsLine instead.
 */
export function StoreRatings({ className }: { className?: string }) {
  const copy = useCopy();
  const rating = copy.funnel.rating;
  const stores = [
    { key: 'app-store', mark: <AppleMark className="h-[1.1em] w-[1.1em] -translate-y-px text-charcoal" />, value: rating.value },
    ...(rating.googlePlay ? [{ key: 'google-play', mark: <GooglePlayMark className="h-[1em] w-[1em]" />, value: rating.googlePlay.value }] : []),
  ];
  return (
    <span aria-hidden="true" className={cn('flex flex-wrap items-center justify-center gap-x-4 gap-y-1', className)}>
      {stores.map((store) => (
        <span key={store.key} className="inline-flex items-center gap-1.5 whitespace-nowrap">
          {store.mark}
          <StarRow value={Number(store.value)} className="text-[0.88em]" />
          <span className="font-extrabold leading-none tabular-nums text-forest">
            {store.value}
            <span className="text-[0.82em] text-muted-brand">{rating.outOf}</span>
          </span>
        </span>
      ))}
    </span>
  );
}

/** Both store ratings, then the customer count with a few faces, between hairlines. */
export function RatingsAndCustomers({ className }: { className?: string }) {
  const copy = useCopy();
  const rating = copy.funnel.rating;
  return (
    <section aria-label={`${storeRatingsLine(rating)}. ${rating.countValue} ${rating.countLabel}`} className={cn('border-y border-forest/12 py-4 text-center', className)}>
      <StoreRatings className="text-[0.875rem]" />
      <p className="mt-3 flex flex-wrap items-center justify-center gap-x-2 gap-y-1" aria-hidden="true">
        <span className="whitespace-nowrap text-[clamp(1.2rem,6vw,1.5rem)] font-extrabold leading-none tracking-[-0.03em] text-forest">{rating.countValue}</span>
        <span className="flex -space-x-1.5">
          {TRUST_AVATAR_IMAGES.slice(0, 3).map((src) => (
            <span key={src} className="relative h-5 w-5 overflow-hidden rounded-full border-[1.5px] border-white bg-mist"><Image src={src} alt="" fill sizes="20px" className="object-cover" /></span>
          ))}
        </span>
        <span className="text-[0.85rem] font-semibold leading-snug text-muted-brand">{rating.countLabel}</span>
      </p>
    </section>
  );
}

const REFERENCE_LOGOS: Record<string, string> = {
  WHO: '/images/source-who.webp',
  UNICEF: '/images/source-unicef.webp',
  NIH: '/images/source-nih.svg',
  EFSA: '/images/source-efsa.webp',
};

/** The organizations whose nutrition guidelines the plan follows: the name, then the logo, rows sliding in one by one. */
export function ReferenceSources({ sources }: { sources: readonly { acronym: string; name: string }[] }) {
  const reduce = useReducedMotion();
  return (
    <ul className="divide-y divide-border-brand overflow-hidden rounded-[1.4rem] border border-border-brand bg-white shadow-[0_6px_16px_rgb(26_71_57_/_0.07)]">
      {sources.map((source, index) => (
        <motion.li
          key={source.acronym}
          initial={reduce ? false : { opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.15 + index * 0.12, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="flex min-h-[4.5rem] items-center justify-between gap-3 px-4 py-3"
        >
          <span className="text-[0.95rem] font-bold leading-snug text-forest">{source.name}{source.name !== source.acronym && ` (${source.acronym})`}</span>
          <Image src={REFERENCE_LOGOS[source.acronym]} alt="" width={128} height={56} className="h-14 w-28 shrink-0 object-contain object-right" />
        </motion.li>
      ))}
    </ul>
  );
}

/** What the tour covers, one short line each, numbered so the next screens read as the same list. */
export function GuideDemo({ points }: { points: readonly string[] }) {
  const reduce = useReducedMotion();
  return (
    <ol className="space-y-3">
      {points.map((point, index) => (
        <motion.li
          key={point}
          initial={reduce ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 + index * 0.1, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="flex items-center gap-3 rounded-2xl bg-white/85 px-4 py-3.5 shadow-[0_6px_16px_rgb(26_71_57_/_0.06)]"
        >
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-forest text-sm font-extrabold text-white">{index + 1}</span>
          <span className="text-[0.95rem] font-bold leading-5 text-forest">{point}</span>
        </motion.li>
      ))}
    </ol>
  );
}

/** The app's workout picker, inside the same iPhone frame. */
export function ActivityDemo({ src, alt, compact = false }: { src: string; alt: string; compact?: boolean }) {
  return (
    <IphoneFrame compact={compact}>
      <Image src={src} alt={alt} width={1179} height={2556} className={SCREEN_MEDIA} />
    </IphoneFrame>
  );
}

const MACRO_CALORIES = [1880, 1880, 1880, 1730, 1730, 1730, 1730] as const;

/** A week whose calories ease after midweek. Heights keep the 1,880 to 1,730 step readable. */
export function MacroDemo({ alt, days }: { alt: string; days: readonly string[] }) {
  const locale = useLocale();
  const reduce = useReducedMotion();
  const format = new Intl.NumberFormat(locale === 'vi' ? 'vi-VN' : 'en-US');

  return (
    <figure aria-label={alt} className="mx-auto w-full max-w-[22rem]">
      <div className="flex h-[min(20rem,38dvh)] items-stretch gap-1.5">
        {MACRO_CALORIES.map((calories, index) => (
          <div key={days[index] ?? index} className="flex min-w-0 flex-1 flex-col">
            <p className="text-center text-[0.7rem] font-bold tracking-tight text-forest">{format.format(calories)}</p>
            <div className="relative mt-2 min-h-0 flex-1">
              <motion.div
                className="absolute inset-x-0 bottom-0 mx-auto w-full max-w-11 origin-bottom rounded-full bg-[linear-gradient(180deg,#d7f6ec_0%,#7edcc4_34%,#1fa892_100%)]"
                style={{ height: calories === MACRO_CALORIES[0] ? '100%' : '86%' }}
                initial={reduce ? false : { scaleY: 0 }}
                animate={{ scaleY: 1 }}
                transition={{ delay: 0.1 + index * 0.06, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              />
            </div>
            <p className={cn('mt-2 text-center text-[11px] font-semibold leading-none', index === 3 ? 'text-teal-brand' : 'text-muted-brand')}>{days[index]}</p>
          </div>
        ))}
      </div>
    </figure>
  );
}

/** TDEE, BMI and macros in one line each: what Nutree works out so the visitor does not have to. */
export function HowItWorksList({ items }: { items: readonly { title: string; body: string }[] }) {
  return (
    <ul className="space-y-3">
      {items.map((item, index) => (
        <li key={item.title} className="flex items-start gap-3 rounded-2xl bg-white/85 px-4 py-3.5 shadow-[0_6px_16px_rgb(26_71_57_/_0.06)]">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-forest text-sm font-extrabold text-white">{index + 1}</span>
          <span className="min-w-0">
            <span className="block text-[0.95rem] font-extrabold leading-5 text-forest">{item.title}</span>
            <span className="mt-1 block text-[0.8rem] font-semibold leading-snug text-slate-brand">{item.body}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Everyday dishes with their calories, so a plan does not read as chicken breast and rice. */
export function MealCardsDemo({ cards }: { cards: readonly { title: string; meta: string; image: string }[] }) {
  const reduce = useReducedMotion();
  return (
    <ul className="flex flex-col gap-2.5">
      {cards.map((card, index) => (
        <motion.li
          key={card.image}
          initial={reduce ? false : { opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 + index * 0.1, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="flex items-center gap-3 rounded-2xl bg-white p-2 shadow-[0_6px_16px_rgb(26_71_57_/_0.06)]"
        >
          <Image src={card.image} alt="" width={128} height={128} className="h-16 w-16 shrink-0 rounded-xl object-cover" />
          <div className="min-w-0">
            <h3 className="text-[15px] font-extrabold leading-5 text-forest">{card.title}</h3>
            <p className="mt-0.5 text-sm font-semibold text-muted-brand">{card.meta}</p>
          </div>
        </motion.li>
      ))}
    </ul>
  );
}
