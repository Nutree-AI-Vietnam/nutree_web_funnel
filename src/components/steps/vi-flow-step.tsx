'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { OptionCard } from '@/components/option-card';
import { PrimaryButton } from '@/components/primary-button';
import { goToNextQuizStep } from '@/lib/quiz/navigation';
import { useQuizStore } from '@/lib/quiz/store';
import { cn } from '@/lib/utils';
import {
  AGREE_OPTIONS,
  ARCHETYPE_BRIDGE,
  ARCHETYPE_EYEBROW,
  ARCHETYPES,
  LIKERT_HINT,
  PLAN_HEADING,
  RELATE_EYEBROW,
  RELATE_OPTIONS,
  archetypeFromAnswers,
  flowScreen,
  likertEyebrow,
  type ArtId,
  type FlowScreen,
  type ViQuizStep,
} from '@/lib/quiz/vi-survey';
import { Art, GroupDot } from './vi-art';
import { QuizStepFrame } from './quiz-step-frame';

function useAnswer(step: string) {
  const answers = useQuizStore((state) => state.planAnswers.answers);
  const setPlanAnswers = useQuizStore((state) => state.setPlanAnswers);
  const save = (key: string) => {
    const current = useQuizStore.getState().planAnswers.answers ?? {};
    setPlanAnswers({ answers: { ...current, [step]: key } });
  };
  return { value: answers?.[step], save };
}

function useMulti(step: string) {
  const raw = useQuizStore((state) => state.planAnswers.answers?.[step]);
  const setPlanAnswers = useQuizStore((state) => state.setPlanAnswers);
  const selected = raw ? raw.split(',').filter(Boolean) : [];
  const toggle = (key: string) => {
    const current = useQuizStore.getState().planAnswers.answers ?? {};
    const next = selected.includes(key) ? selected.filter((item) => item !== key) : [...selected, key];
    setPlanAnswers({ answers: { ...current, [step]: next.join(',') } });
  };
  return { selected, toggle };
}

function stripQuotes(title: string) {
  return title.replace(/^[“"]\s*/, '').replace(/\s*[”"]$/, '');
}

/** Data-driven Vietnamese screen. Answers stay in the browser; calories do not read them. */
export function ViFlowStep({ step }: { step: ViQuizStep }) {
  const screen = flowScreen(step);
  if (!screen) return null;
  return <FlowBody step={step} screen={screen} />;
}

function FlowBody({ step, screen }: { step: ViQuizStep; screen: FlowScreen }) {
  const router = useRouter();
  const next = () => goToNextQuizStep(router, step);

  if (screen.type === 'insight') return <InsightFlow screen={screen} onNext={next} />;

  if (screen.type === 'loader') return <FlowLoader step={step} title={screen.title} lines={screen.lines} art={screen.art} />;

  if (screen.type === 'cheer') return <CheerStep screen={screen} onNext={next} />;

  if (screen.type === 'archetype') return <ArchetypeStep onNext={next} />;

  if (screen.type === 'explain') return <ExplainStep screen={screen} onNext={next} />;

  if (screen.type === 'scale' && screen.variant === 'relate' && screen.art) {
    return <RelateScale step={step} title={screen.title} art={screen.art} />;
  }

  if (screen.type === 'scale') return <ScaleStep step={step} title={screen.title} art={screen.art} />;

  if (screen.type === 'multi') return <MultiStep step={step} title={screen.title} note={screen.note} options={screen.options} />;

  if (screen.type === 'quiz' || screen.type === 'choice') {
    return (
      <ChoiceStep
        step={step}
        title={screen.title}
        note={'note' in screen ? screen.note : undefined}
        options={screen.options}
        art={screen.type === 'choice' ? screen.art : undefined}
        quote={screen.type === 'choice' ? screen.quote : undefined}
        dot={screen.type === 'quiz' ? screen.dot : undefined}
      />
    );
  }

  return null;
}

function TintedPanel({ art, children, cta }: { art?: ReactNode; children: ReactNode; cta: ReactNode }) {
  return (
    <div className="-mx-5 -mb-[max(1rem,env(safe-area-inset-bottom))] flex min-h-0 flex-1 flex-col bg-[#DDF1E8] px-5 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div className="flex min-h-0 flex-1 flex-col">
        {art ? <div className="flex min-h-28 flex-1 items-center justify-center py-3">{art}</div> : null}
        <div className="flex flex-col gap-3 pb-1">{children}</div>
      </div>
      <div className="shrink-0 bg-[#DDF1E8] pt-3">{cta}</div>
    </div>
  );
}

function InsightFlow({ screen, onNext }: { screen: Extract<FlowScreen, { type: 'insight' }>; onNext: () => void }) {
  const copy = (
    <>
      <p className="text-[0.75rem] font-extrabold uppercase tracking-[0.08em] text-teal-brand">{screen.eyebrow}</p>
      <h1 className="text-[1.55rem] font-extrabold leading-[1.2] tracking-[-0.03em] text-forest">{screen.title}</h1>
      <p className="text-[1.02rem] font-semibold leading-relaxed text-slate-brand">{screen.body}</p>
      {screen.points && screen.points.length > 0 && (
        <ul className="flex flex-col gap-2.5 rounded-[1.4rem] bg-white px-4 py-4 shadow-[0_6px_16px_rgb(23_69_58_/_0.06)]">
          {screen.points.map((point) => (
            <li key={point} className="flex items-start gap-2.5 text-[0.95rem] font-semibold leading-snug text-forest">
              <span aria-hidden="true" className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-teal-brand/15 text-[0.7rem] font-black text-teal-brand">✓</span>
              <span>{point}</span>
            </li>
          ))}
        </ul>
      )}
    </>
  );
  const cta = <PrimaryButton onClick={onNext}>{screen.cta}</PrimaryButton>;
  if (screen.tone === 'tinted') {
    return (
      <TintedPanel art={screen.art ? <Art id={screen.art} /> : undefined} cta={cta}>
        {copy}
      </TintedPanel>
    );
  }
  return (
    <QuizStepFrame pinTop>
      <div className="flex flex-col gap-4">
        {screen.art ? <div className="flex justify-center"><Art id={screen.art} /></div> : null}
        {copy}
      </div>
      <div className="mt-auto pt-3">{cta}</div>
    </QuizStepFrame>
  );
}

function advance(step: ViQuizStep, key: string, save: (key: string) => void, router: ReturnType<typeof useRouter>, pending: string | null, setPending: (key: string) => void) {
  if (pending) return;
  save(key);
  setPending(key);
  goToNextQuizStep(router, step);
}

function ChoiceStep({
  step, title, note, options, art, quote, dot,
}: {
  step: ViQuizStep;
  title: string;
  note?: string;
  options: readonly { key: string; label: string }[];
  art?: ArtId;
  quote?: boolean;
  dot?: 'green' | 'amber' | 'coral';
}) {
  const router = useRouter();
  const { save } = useAnswer(step);
  const [pending, setPending] = useState<string | null>(null);
  const list = (
    <div className="flex flex-col gap-2.5">
      {options.map((option) => (
        <OptionCard
          key={option.key}
          label={option.label}
          plain
          large
          selected={pending === option.key}
          onClick={() => advance(step, option.key, save, router, pending, setPending)}
        />
      ))}
    </div>
  );

  if (quote && art) {
    return (
      <QuizStepFrame pinTop className="gap-3">
        <RelateIntro art={art} statement={title} note={note} />
        {list}
      </QuizStepFrame>
    );
  }

  if (art || dot) {
    return (
      <QuizStepFrame pinTop className="gap-3">
        {art ? <div className="flex justify-center"><Art id={art} size={56} /></div> : null}
        <h1 className="flex items-center justify-center gap-2 text-center text-[clamp(1.35rem,5.2vw,1.6rem)] font-extrabold leading-[1.2] tracking-tight text-forest">
          {dot ? <GroupDot tone={dot} /> : null}
          <span>{title}</span>
        </h1>
        {note ? <p className="text-center text-base font-semibold leading-relaxed text-muted-brand">{note}</p> : null}
        {list}
      </QuizStepFrame>
    );
  }

  return (
    <QuizStepFrame title={title} hint={note} className="gap-3">
      {list}
    </QuizStepFrame>
  );
}

function RelateIntro({ art, statement, note }: { art: ArtId; statement: string; note?: string }) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-[0.75rem] font-extrabold uppercase tracking-[0.08em] text-teal-brand">{RELATE_EYEBROW}</p>
      <div className="flex justify-center"><Art id={art} size={160} /></div>
      <h1 className="border-l-4 border-[#14473A] bg-white px-4 py-4 text-[1.12rem] font-extrabold leading-snug text-forest shadow-[0_6px_16px_rgb(20_71_58_/_0.06)]">
        <span aria-hidden="true" className="text-[#F08A6B]">“ </span>
        {stripQuotes(statement)}
        <span aria-hidden="true" className="text-[#F08A6B]"> ”</span>
      </h1>
      {note ? <p className="text-[0.98rem] font-semibold leading-relaxed text-slate-brand">{note}</p> : null}
    </div>
  );
}

function RelateScale({ step, title, art }: { step: ViQuizStep; title: string; art: ArtId }) {
  const router = useRouter();
  const { save } = useAnswer(step);
  const [pending, setPending] = useState<string | null>(null);
  return (
    <QuizStepFrame pinTop className="gap-3">
      <RelateIntro art={art} statement={title} />
      <div className="flex flex-col gap-2.5">
        {RELATE_OPTIONS.map((option) => (
          <button
            key={option.key}
            type="button"
            aria-pressed={pending === option.key}
            onClick={() => advance(step, option.key, save, router, pending, setPending)}
            className={cn(
              'min-h-12 rounded-full border px-4 text-[1.02rem] font-extrabold text-forest transition focus:outline-none focus-visible:ring-4 focus-visible:ring-teal-brand/25',
              pending === option.key ? 'border-[#14473A] bg-[#14473A] text-white' : 'border-[#14473A]/15 bg-white shadow-sm',
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    </QuizStepFrame>
  );
}

function ScaleStep({ step, title, art }: { step: ViQuizStep; title: string; art?: ArtId }) {
  const router = useRouter();
  const { save } = useAnswer(step);
  const [pending, setPending] = useState<string | null>(null);
  const index = Number(/^profile_(\d+)$/.exec(step)?.[1] ?? 0);

  return (
    <QuizStepFrame pinTop className="gap-3">
      {index > 0 ? <p className="text-[0.75rem] font-extrabold uppercase tracking-[0.08em] text-teal-brand">{likertEyebrow(index)}</p> : null}
      {art ? <div className="flex justify-center"><Art id={art} size={56} /></div> : null}
      <h1 className="text-[clamp(1.35rem,5.2vw,1.6rem)] font-extrabold leading-[1.2] tracking-tight text-forest">{title}</h1>
      <div className="flex flex-col gap-2.5">
        {AGREE_OPTIONS.map((option) => (
          <OptionCard
            key={option.key}
            label={option.label}
            plain
            large
            selected={pending === option.key}
            onClick={() => advance(step, option.key, save, router, pending, setPending)}
          />
        ))}
      </div>
      <p className="rounded-[1.2rem] bg-white px-4 py-3 text-[0.92rem] font-semibold leading-snug text-slate-brand shadow-[0_6px_16px_rgb(20_71_58_/_0.06)]">{LIKERT_HINT}</p>
    </QuizStepFrame>
  );
}

function MultiStep({
  step, title, note, options,
}: {
  step: ViQuizStep;
  title: string;
  note?: string;
  options: readonly { key: string; label: string }[];
}) {
  const router = useRouter();
  const { selected, toggle } = useMulti(step);
  return (
    <QuizStepFrame title={title} hint={note} className="gap-3">
      <div className="flex flex-col gap-2.5">
        {options.map((option) => (
          <OptionCard key={option.key} label={option.label} plain large selected={selected.includes(option.key)} onClick={() => toggle(option.key)} />
        ))}
      </div>
      <div className="mt-auto pt-3">
        <PrimaryButton disabled={selected.length === 0} onClick={() => goToNextQuizStep(router, step)}>Tiếp tục</PrimaryButton>
      </div>
    </QuizStepFrame>
  );
}

function ExplainStep({ screen, onNext }: { screen: Extract<FlowScreen, { type: 'explain' }>; onNext: () => void }) {
  const picked = useQuizStore((state) => state.planAnswers.answers?.[screen.quiz]);
  const right = picked === undefined || picked === (flowScreen(screen.quiz) as { correct?: string } | undefined)?.correct;
  const title = right ? (screen.titleRight ?? screen.yes) : (screen.titleRetry ?? screen.retry);
  const copy = (
    <>
      <h1 className="text-[1.55rem] font-extrabold leading-tight text-forest">{title}</h1>
      <p className="text-[1.02rem] font-semibold leading-relaxed text-slate-brand">{screen.body}</p>
    </>
  );
  const cta = <PrimaryButton onClick={onNext}>{screen.cta}</PrimaryButton>;
  if (screen.tone === 'tinted') {
    return (
      <TintedPanel art={screen.art ? <Art id={screen.art} emphasis={screen.emphasis} /> : undefined} cta={cta}>
        {copy}
      </TintedPanel>
    );
  }
  return (
    <QuizStepFrame pinTop>
      <div className="flex flex-col gap-3">
        {screen.art ? <div className="flex justify-center"><Art id={screen.art} emphasis={screen.emphasis} /></div> : null}
        {copy}
      </div>
      <div className="mt-auto pt-3">{cta}</div>
    </QuizStepFrame>
  );
}

function CheerStep({ screen, onNext }: { screen: Extract<FlowScreen, { type: 'cheer' }>; onNext: () => void }) {
  const name = useQuizStore((state) => state.data.name)?.trim() || 'bạn';
  const copy = (
    <div className="flex flex-col gap-3 text-center">
      <h1 className="text-[1.7rem] font-extrabold leading-tight text-forest">{screen.title(name)}</h1>
      <p className="text-[1.02rem] font-semibold leading-relaxed text-slate-brand">{screen.body}</p>
    </div>
  );
  const cta = <PrimaryButton onClick={onNext}>{screen.cta}</PrimaryButton>;
  if (screen.tone === 'tinted') {
    return (
      <TintedPanel art={screen.art ? <Art id={screen.art} /> : undefined} cta={cta}>
        {copy}
      </TintedPanel>
    );
  }
  return (
    <QuizStepFrame pinTop className="justify-center">
      <div className="flex flex-1 flex-col justify-center gap-3 text-center">{copy}</div>
      <div className="mt-auto pt-3">{cta}</div>
    </QuizStepFrame>
  );
}

function ArchetypeStep({ onNext }: { onNext: () => void }) {
  const answers = useQuizStore((state) => state.planAnswers.answers);
  const profile = ARCHETYPES[archetypeFromAnswers(answers)];
  return (
    <TintedPanel
      art={<Art id={profile.art} size={96} />}
      cta={<PrimaryButton onClick={onNext}>Hợp với mình</PrimaryButton>}
    >
      <p className="text-[0.75rem] font-extrabold uppercase tracking-[0.08em] text-teal-brand">{ARCHETYPE_EYEBROW}</p>
      <h1 className="text-[1.7rem] font-extrabold leading-tight text-forest">{profile.name}</h1>
      <p className="text-[1.02rem] font-semibold leading-relaxed text-slate-brand">{profile.body}</p>
      <div className="rounded-[1.4rem] bg-white px-4 py-4 shadow-[0_6px_16px_rgb(20_71_58_/_0.06)]">
        <p className="text-[0.95rem] font-extrabold text-forest">{PLAN_HEADING}</p>
        <ul className="mt-2.5 flex flex-col gap-2">
          {profile.plan.map((item) => (
            <li key={item} className="flex items-start gap-2.5 text-[0.95rem] font-semibold leading-snug text-forest">
              <span aria-hidden="true" className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-teal-brand/15 text-[0.7rem] font-black text-teal-brand">✓</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
      <p className="text-[0.98rem] font-semibold leading-relaxed text-slate-brand">{ARCHETYPE_BRIDGE}</p>
    </TintedPanel>
  );
}

function FlowLoader({ step, title, lines, art }: { step: ViQuizStep; title: string; lines: readonly string[]; art?: ArtId }) {
  const router = useRouter();
  const routerRef = useRef(router);
  routerRef.current = router;
  const [shown, setShown] = useState(1);
  const durationMs = 700 * (lines.length + 1);

  useEffect(() => {
    // Advance on timers only. A CSS bar can finish while this effect restarts, and
    // useRouter() is a new object on many renders, so the router must not be a dependency.
    let left = false;
    const go = () => {
      if (left) return;
      if (useQuizStore.getState().currentStep !== step) return;
      left = true;
      goToNextQuizStep(routerRef.current, step);
    };
    const timers = lines.map((_, index) => window.setTimeout(() => setShown(index + 1), 700 * (index + 1)));
    const done = window.setTimeout(go, durationMs);
    const fallback = window.setTimeout(go, durationMs + 1500);
    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
      window.clearTimeout(done);
      window.clearTimeout(fallback);
    };
    // `lines` is the screen catalog array. Its identity is stable; length covers a catalog edit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [durationMs, step]);

  return (
    <div className="flex min-h-0 flex-1 flex-col justify-center gap-4">
      {art ? <div className="flex justify-center"><Art id={art} size={56} /></div> : null}
      <h1 className="text-center text-[1.45rem] font-extrabold leading-tight text-forest">{title}</h1>
      <div className="h-2 overflow-hidden rounded-full bg-[#14473A]/10" aria-hidden="true">
        <div className="vi-loader-bar h-full rounded-full bg-[#14473A]" style={{ animationDuration: `${durationMs}ms` }} />
      </div>
      <ol className="grid gap-3 rounded-[1.4rem] bg-white px-4 py-4">
        {lines.map((line, index) => {
          const done = index < shown;
          return (
            <li key={line} className="flex items-start gap-2.5 text-[0.95rem] font-semibold leading-snug">
              <span
                aria-hidden="true"
                className={cn(
                  'mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full text-[0.7rem] font-black',
                  done ? 'bg-[#14473A] text-white' : 'bg-[#14473A]/10 text-transparent',
                )}
              >
                ✓
              </span>
              <span className={done ? 'text-forest' : 'text-muted-brand'}>{line}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
