'use client';

import { useEffect, useState } from 'react';
import { ConversionShell } from '@/components/conversion-shell';
import { ActivityDemo, GuideDemo, HowItWorksList, MacroDemo, MealCardsDemo, MealSnapDemo, ReferenceSources, ScienceCollage, ScienceSourceLogos } from '@/components/value-tour/value-tour-demos';
import { trackStepViewed } from '@/lib/analytics/track';
import { useCopy, useLocale } from '@/lib/copy/use-copy';
import { useHydrated, useQuizStore } from '@/lib/quiz/store';
import { computeTdeeResult } from '@/lib/tdee/calculator';

const STEPS = ['guide', 'snap', 'activity', 'macros', 'works', 'sources', 'meals'] as const;
type ValueStep = (typeof STEPS)[number];

export function ValueTourScreen({ onComplete, onMissingLead }: { onComplete: () => void; onMissingLead: () => void }) {
  const copy = useCopy();
  const locale = useLocale();
  const hydrated = useHydrated();
  const lead = useQuizStore((state) => state.lead);
  const data = useQuizStore((state) => state.data);
  const storedTdee = useQuizStore((state) => state.tdee);
  const [step, setStep] = useState<ValueStep>('guide');
  const tdee = storedTdee ?? computeTdeeResult(data);
  const numberLocale = locale === 'vi' ? 'vi-VN' : 'en-US';

  useEffect(() => {
    if (hydrated && !lead) onMissingLead();
  }, [hydrated, lead, onMissingLead]);

  useEffect(() => {
    trackStepViewed(`value_${step}`);
  }, [step]);

  if (!hydrated || !lead) return null;

  const index = STEPS.indexOf(step);
  const screen = step === 'works'
    ? { eyebrow: copy.science.eyebrow, title: copy.science.headline, body: copy.science.hint, cta: copy.science.cta }
    : step === 'sources'
      ? { eyebrow: copy.science.sourcesEyebrow, title: copy.science.sourcesTitle, body: copy.science.sourcesIntro, cta: copy.science.cta }
      : copy.valueTour[step];
  const advance = () => {
    const next = STEPS[index + 1];
    if (next) setStep(next);
    else onComplete();
  };
  const detail = step === 'macros' && tdee
    ? copy.valueTour.macros.personalized(Math.round(tdee.calories).toLocaleString(numberLocale), Math.round(tdee.protein_g))
    : step === 'activity' && data.training_days_per_week != null
      ? copy.valueTour.activity.personalized(data.training_days_per_week)
      : screen.body;

  return (
    <ConversionShell className="min-h-0 gap-4">
      <div>
        <p className="text-[0.75rem] font-extrabold tracking-[0.02em] text-teal-brand">{copy.valueTour.stepLabel(index + 1, STEPS.length)}</p>
        <div className="mt-3 flex gap-1.5" aria-hidden="true">
          {STEPS.map((item, itemIndex) => (
            <span key={item} className={`h-1.5 flex-1 rounded-full ${itemIndex <= index ? 'bg-forest' : 'bg-forest/15'}`} />
          ))}
        </div>
      </div>
      <section className="flex flex-1 flex-col justify-center">
        <p className="text-[0.78rem] font-extrabold tracking-[0.02em] text-teal-brand">{screen.eyebrow}</p>
        <h1 className="mt-3 max-w-[24rem] text-[1.7rem] font-extrabold leading-[1.12] tracking-[-0.03em] text-forest">{screen.title}</h1>
        <div className="mt-6">
          {step === 'guide' && <GuideDemo points={copy.valueTour.guide.points} />}
          {step === 'snap' && <MealSnapDemo label={copy.valueTour.snap.videoLabel} />}
          {step === 'activity' && (
            <ActivityDemo
              src={locale === 'vi' ? '/value-tour/workout-vi.png' : '/value-tour/workout-en.png'}
              alt={copy.valueTour.activity.imageAlt}
            />
          )}
          {step === 'macros' && tdee && (
            <MacroDemo
              calories={Math.round(tdee.calories).toLocaleString(numberLocale)}
              macros={{ protein_g: Math.round(tdee.protein_g), carbs_g: Math.round(tdee.carbs_g), fat_g: Math.round(tdee.fat_g) }}
              labels={copy.valueTour.macros.labels}
            />
          )}
          {step === 'works' && (
            <div className="space-y-5">
              <HowItWorksList items={copy.science.items} />
              <ScienceSourceLogos sources={copy.valueTour.science.sources} label={copy.valueTour.science.sourcesLabel} />
              <ScienceCollage locale={locale} label={copy.valueTour.science.collageLabel} />
            </div>
          )}
          {step === 'sources' && <ReferenceSources sources={copy.science.sources} />}
          {step === 'meals' && <MealCardsDemo cards={copy.valueTour.meals.cards} cue={copy.valueTour.meals.cue} />}
        </div>
        <p className="mt-5 text-[0.98rem] font-semibold leading-relaxed text-slate-brand">{detail}</p>
        {step === 'works' && <p className="mt-3 text-xs font-semibold leading-relaxed text-muted-brand">{copy.valueTour.science.disclaimer}</p>}
        {step === 'sources' && <p className="mt-3 text-xs font-semibold leading-relaxed text-muted-brand">{copy.science.disclaimer}</p>}
      </section>
      <div className="sticky bottom-0 z-20 -mx-5 bg-[linear-gradient(to_top,#f3f8f6_70%,rgb(243_248_246_/_0))] px-5 pb-1 pt-5">
        <button type="button" onClick={advance} className="min-h-14 w-full rounded-2xl bg-forest px-6 text-base font-extrabold text-white shadow-[0_16px_34px_rgb(23_69_58_/_0.22)] transition hover:bg-emerald-deep focus:outline-none focus-visible:ring-4 focus-visible:ring-teal-brand/25 active:scale-[0.99]">
          {screen.cta}
        </button>
      </div>
    </ConversionShell>
  );
}
