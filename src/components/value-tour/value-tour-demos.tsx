import Image from 'next/image';
import type { Locale } from '@/lib/copy';

const PHONE_FRAME = 'mx-auto w-[15.5rem] overflow-hidden rounded-[2rem] border-[6px] border-[#10241e] bg-black shadow-[0_22px_50px_rgb(26_71_57_/_0.18)]';

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

/** The meal-scan clip from the mobile onboarding promo, in the same phone frame. */
export function MealSnapDemo({ label }: { label: string }) {
  return (
    <div className={PHONE_FRAME}>
      <video
        className="aspect-[9/16] max-h-[min(15rem,34dvh)] w-full object-cover object-top"
        src="/value-tour/meal-scan-demo.mp4"
        poster="/value-tour/meal-scan-poster.png"
        aria-label={label}
        autoPlay
        muted
        loop
        playsInline
      />
    </div>
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
      {items.map((item) => (
        <li key={item.title} className="flex items-start gap-3 rounded-2xl bg-white/85 px-4 py-3 shadow-[0_10px_30px_rgb(26_71_57_/_0.06)]">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-mist text-lg" aria-hidden="true">{item.icon}</span>
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
          className="flex items-center gap-3 px-3 py-2.5 transition hover:bg-mist focus:outline-none focus-visible:ring-4 focus-visible:ring-teal-brand/20"
        >
          <span className="grid h-12 w-24 shrink-0 place-items-center rounded-xl bg-white px-1.5">
            <Image src={REFERENCE_LOGOS[source.acronym]} alt="" width={96} height={48} className="max-h-10 w-full object-contain" />
          </span>
          <span className="min-w-0">
            <span className="block text-xs font-extrabold text-forest">{source.name}</span>
            <span className="mt-0.5 block text-[0.68rem] font-semibold leading-snug text-muted-brand">{source.detail}</span>
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

export function MacroDemo({
  calories,
  macros,
  labels,
}: {
  calories: string;
  macros: { protein_g: number; carbs_g: number; fat_g: number };
  labels: { protein: string; carbs: string; fat: string };
}) {
  const rows = [
    { key: 'protein', grams: macros.protein_g, width: '72%', color: 'bg-teal-brand' },
    { key: 'carbs', grams: macros.carbs_g, width: '58%', color: 'bg-[#e7a23a]' },
    { key: 'fat', grams: macros.fat_g, width: '36%', color: 'bg-forest' },
  ] as const;

  return (
    <div className="rounded-[1.75rem] bg-white/85 p-5 shadow-[0_16px_40px_rgb(26_71_57_/_0.08)]">
      <p className="font-display text-4xl font-extrabold tracking-tight text-forest">{calories}</p>
      <p className="text-sm font-semibold text-muted-brand">kcal</p>
      <div className="mt-5 space-y-3">
        {rows.map((row) => (
          <div key={row.key}>
            <div className="mb-1 flex justify-between text-xs font-bold text-forest">
              <span>{labels[row.key]}</span>
              <span>{row.grams}g</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-mist">
              <div className={`h-full rounded-full ${row.color}`} style={{ width: row.width }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function MealCardsDemo({ cards, cue }: { cards: readonly { title: string; meta: string; image: string }[]; cue: string }) {
  return (
    <div>
      <div className="-mx-5 flex gap-3 overflow-x-auto px-5 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {cards.map((card) => (
          <article key={card.image} className="w-40 shrink-0 overflow-hidden rounded-[1.4rem] bg-white shadow-[0_16px_40px_rgb(26_71_57_/_0.08)]">
            <Image src={card.image} alt="" width={320} height={240} className="h-28 w-full object-cover" />
            <div className="px-3 py-3">
              <h3 className="text-sm font-extrabold leading-5 text-forest">{card.title}</h3>
              <p className="mt-1 text-xs font-semibold text-muted-brand">{card.meta}</p>
            </div>
          </article>
        ))}
      </div>
      <p className="mt-3 text-center text-xs font-semibold text-muted-brand">{cue}</p>
    </div>
  );
}

/** The workout picker screenshot mobile shows inside a phone frame. */
export function ActivityDemo({ src, alt }: { src: string; alt: string }) {
  return (
    <div className={`${PHONE_FRAME} bg-white`}>
      <Image src={src} alt={alt} width={390} height={844} className="h-[min(15rem,34dvh)] w-full object-cover object-top" />
    </div>
  );
}
