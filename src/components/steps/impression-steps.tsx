'use client';

import { useRouter } from 'next/navigation';
import { motion, useReducedMotion } from 'motion/react';
import Image from 'next/image';
import { PrimaryButton } from '@/components/primary-button';
import { Slideshow } from '@/components/slideshow';
import type { Copy } from '@/lib/copy';
import { useCopy } from '@/lib/copy/use-copy';
import { goToNextQuizStep } from '@/lib/quiz/navigation';
import { getGreetingName } from '@/lib/quiz/reflection';
import { useQuizStore } from '@/lib/quiz/store';
import { QuizStepFrame } from './quiz-step-frame';

const SCIENCE_SOURCE_LOGOS: Record<string, string> = {
  WHO: '/images/source-who.webp',
  UNICEF: '/images/source-unicef.webp',
  NIH: '/images/source-nih.svg',
  EFSA: '/images/source-efsa.webp',
};

/** Welcome screen — emotional connection, personalized greeting after name_ask. */
export function WelcomeStep() {
  const router = useRouter();
  const copy = useCopy();
  const name = useQuizStore((s) => s.data.name);
  const greetingName = getGreetingName(name, copy);

  return (
    <QuizStepFrame className="justify-center gap-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', damping: 18, stiffness: 200 }}
        className="relative mx-auto h-56 w-full max-w-[25rem] overflow-hidden rounded-[2rem] border border-white/80 bg-white/80 shadow-[0_22px_60px_rgb(26_71_57_/_0.14)] sm:h-64"
      >
        <Image
          src="/images/welcome-meal.webp"
          alt={copy.welcome.imageAlt}
          fill
          priority
          sizes="(max-width: 640px) calc(100vw - 2.5rem), 25rem"
          className="object-cover"
        />
        <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-forest/25 via-transparent to-white/10" />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.4 }}
        className="text-center"
      >
        <h1 className="text-[2rem] font-extrabold leading-tight text-forest">
          {copy.welcome.headline.replace('[name]', greetingName)}
        </h1>
        <p className="mt-3 text-sm font-semibold leading-relaxed text-slate-brand">
          {copy.welcome.body}
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.4 }}
        className="grid grid-cols-3 gap-2"
      >
        {copy.welcome.stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl bg-white/82 px-3 py-3 text-center shadow-[inset_0_1px_0_rgb(255_255_255_/_0.78)] backdrop-blur"
          >
            <div className="text-sm font-extrabold text-forest">{stat.value}</div>
            <div className="mt-0.5 text-[0.65rem] font-semibold text-muted-brand">{stat.label}</div>
          </div>
        ))}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45, duration: 0.4 }}
        className="mt-auto pt-4"
      >
        <PrimaryButton onClick={() => goToNextQuizStep(router, 'welcome')}>
          {copy.welcome.cta}
        </PrimaryButton>
      </motion.div>
    </QuizStepFrame>
  );
}

function ScienceSourcesSection({ copy }: { copy: Copy }) {
  return (
    <section className="rounded-[1.5rem] border border-border-brand/80 bg-white/80 p-3 shadow-sm">
      <div className="divide-y divide-border-brand/70 overflow-hidden rounded-2xl border border-border-brand/70 bg-white/70">
        {copy.science.sources.map((source) => (
          <a
            key={source.acronym}
            href={source.href}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-3 px-3 py-2.5 transition hover:bg-mist focus:outline-none focus-visible:ring-4 focus-visible:ring-teal-brand/20"
          >
            <span className="grid h-12 w-24 shrink-0 place-items-center rounded-xl bg-white px-1.5">
              <Image
                src={SCIENCE_SOURCE_LOGOS[source.acronym]}
                alt={`${source.name} logo`}
                width={96}
                height={64}
                sizes="96px"
                className="max-h-12 w-full object-contain"
              />
            </span>
            <span className="min-w-0">
              <span className="block text-xs font-extrabold text-forest">{source.name}</span>
              <span className="mt-0.5 block text-[0.68rem] font-semibold leading-snug text-muted-brand">{source.detail}</span>
            </span>
            <span aria-hidden="true" className="ml-auto text-sm font-bold text-teal-brand">↗</span>
          </a>
        ))}
      </div>
    </section>
  );
}

/** Science screen — explains TDEE/BMI/macro before the source screen. */
export function ScienceStep() {
  const router = useRouter();
  const copy = useCopy();

  return (
    <QuizStepFrame title={copy.science.headline} eyebrow={copy.science.eyebrow} className="gap-3 overflow-hidden">
      <div className="min-h-0 flex flex-1 flex-col gap-2">
        <Slideshow
          slides={copy.science.slides}
          compact
          ariaLabel={copy.science.carouselLabel}
          visualImage="/images/macro-progress.webp"
        />
      </div>

      <div className="mt-auto pt-2">
        <PrimaryButton onClick={() => goToNextQuizStep(router, 'science')}>
          {copy.science.cta}
        </PrimaryButton>
      </div>
    </QuizStepFrame>
  );
}

/** Source screen — shows the public organizations Nutree references. */
export function ScienceSourcesStep() {
  const router = useRouter();
  const copy = useCopy();

  return (
    <QuizStepFrame
      title={copy.science.sourcesTitle}
      hint={copy.science.sourcesIntro}
      eyebrow={copy.science.sourcesEyebrow}
      className="gap-3 overflow-hidden"
    >
      <div className="flex min-h-0 flex-1 flex-col justify-start pt-2">
        <ScienceSourcesSection copy={copy} />
      </div>
      <div className="mt-auto pt-2">
        <PrimaryButton onClick={() => goToNextQuizStep(router, 'science_sources')}>
          {copy.science.cta}
        </PrimaryButton>
      </div>
    </QuizStepFrame>
  );
}

/** A short, animated reassurance screen before the calculation wait state. */
export function CarePauseStep() {
  const router = useRouter();
  const copy = useCopy();
  const reduce = useReducedMotion();

  return (
    <QuizStepFrame className="gap-7 text-center">
      <motion.div
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 170, damping: 13 }}
        className="mx-auto grid h-36 w-36 place-items-center rounded-full bg-rose-50"
      >
        <motion.svg
          viewBox="0 0 120 120"
          className="h-24 w-24"
          role="img"
          aria-label="A heart"
          animate={reduce ? { scale: 1 } : { scale: [1, 1.08, 1] }}
          transition={reduce ? { duration: 0 } : { duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
        >
          <path d="M60 98 18 55C-2 34 13 8 35 14c12 3 19 13 25 21 6-8 13-18 25-21 22-6 37 20 17 41L60 98Z" fill="#f04f62" />
          <path d="M30 31c4-6 10-9 17-9" fill="none" stroke="#ffb7c1" strokeLinecap="round" strokeWidth="7" />
        </motion.svg>
      </motion.div>
      <div>
        <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-teal-brand">{copy.care_pause.eyebrow}</p>
        <h1 className="mt-3 text-[2rem] font-extrabold leading-tight text-forest [text-wrap:balance]">{copy.care_pause.headline}</h1>
        <p className="mt-3 text-base font-semibold leading-relaxed text-muted-brand">{copy.care_pause.body}</p>
        <p className="mt-5 text-lg font-extrabold text-forest">{copy.care_pause.support}</p>
      </div>
      <div className="mt-auto w-full pt-5">
        <PrimaryButton onClick={() => goToNextQuizStep(router, 'care_pause')}>{copy.care_pause.cta}</PrimaryButton>
      </div>
    </QuizStepFrame>
  );
}

/** Preview screen — anticipation, shows what's coming before the calculating step. */
export function PreviewStep() {
  const router = useRouter();
  const copy = useCopy();
  const items = copy.preview.items;

  return (
    <QuizStepFrame title={copy.preview.headline} eyebrow={copy.preview.eyebrow}>
      <div className="flex flex-1 flex-col gap-3">
        {items.map((item, index) => (
          <motion.div
            key={item.title}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + index * 0.12, duration: 0.35 }}
            className="rounded-2xl bg-white/86 px-4 py-4 shadow-[inset_0_1px_0_rgb(255_255_255_/_0.78)]"
          >
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-teal-brand/15 to-forest/10">
                <span className="text-lg">{item.icon}</span>
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-extrabold leading-snug text-forest">{item.title}</h3>
                <p className="mt-0.5 text-xs font-semibold leading-relaxed text-slate-brand">{item.body}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="mt-auto pt-4">
        <PrimaryButton onClick={() => goToNextQuizStep(router, 'preview')}>
          {copy.preview.cta}
        </PrimaryButton>
      </div>
    </QuizStepFrame>
  );
}
