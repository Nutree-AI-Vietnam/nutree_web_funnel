import { copyFor, type Locale } from '@/lib/copy';

/** Server-rendered landing copy. Crawlers that do not run JavaScript see the same words as the page. */
export function SurveyLandingFallback({ language }: { language: Locale }) {
  const landing = copyFor(language).landing;
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-5 pb-8 pt-8">
      <h1 className="max-w-[22rem] text-[clamp(2.35rem,7vw,4.25rem)] font-extrabold leading-[1.02] text-forest">
        {landing.headline}
      </h1>
      <p className="mt-3 max-w-[29rem] text-base font-semibold leading-relaxed text-slate-brand">{landing.subheadline}</p>
      <p className="mt-6 text-[0.7rem] font-extrabold uppercase tracking-[0.16em] text-teal-brand">{landing.planTitle}</p>
      <p className="mt-2 text-sm font-semibold leading-relaxed text-muted-brand">
        {`${landing.planCalories} ${landing.planCaloriesUnit}. ${landing.planSubtitle}`}
      </p>
    </main>
  );
}
