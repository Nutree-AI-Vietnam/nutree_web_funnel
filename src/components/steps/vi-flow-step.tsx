'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { OptionCard } from '@/components/option-card';
import { PrimaryButton } from '@/components/primary-button';
import { goToNextQuizStep } from '@/lib/quiz/navigation';
import { useQuizStore } from '@/lib/quiz/store';
import {
  AGREE_OPTIONS,
  ARCHETYPES,
  archetypeFromAnswers,
  flowScreen,
  type FlowScreen,
  type ViQuizStep,
} from '@/lib/quiz/vi-survey';
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

/** Data-driven Vietnamese screen. Answers stay in the browser; calories do not read them. */
export function ViFlowStep({ step }: { step: ViQuizStep }) {
  const screen = flowScreen(step);
  if (!screen) return null;
  return <FlowBody step={step} screen={screen} />;
}

function FlowBody({ step, screen }: { step: ViQuizStep; screen: FlowScreen }) {
  const router = useRouter();
  const next = () => goToNextQuizStep(router, step);

  if (screen.type === 'insight') {
    return (
      <QuizStepFrame pinTop>
        <div className="flex flex-col gap-4">
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
        </div>
        <div className="mt-auto pt-3">
          <PrimaryButton onClick={next}>{screen.cta}</PrimaryButton>
        </div>
      </QuizStepFrame>
    );
  }

  if (screen.type === 'loader') return <FlowLoader step={step} title={screen.title} lines={screen.lines} />;

  if (screen.type === 'cheer') return <CheerStep screen={screen} onNext={next} />;

  if (screen.type === 'archetype') return <ArchetypeStep onNext={next} />;

  if (screen.type === 'explain') return <ExplainStep screen={screen} onNext={next} />;

  if (screen.type === 'scale') return <ScaleStep step={step} title={screen.title} />;

  if (screen.type === 'multi') return <MultiStep step={step} title={screen.title} note={screen.note} options={screen.options} />;

  if (screen.type === 'quiz' || screen.type === 'choice') {
    return <ChoiceStep step={step} title={screen.title} note={'note' in screen ? screen.note : undefined} options={screen.options} />;
  }

  return null;
}

function ChoiceStep({
  step, title, note, options,
}: {
  step: ViQuizStep;
  title: string;
  note?: string;
  options: readonly { key: string; label: string }[];
}) {
  const router = useRouter();
  const { save } = useAnswer(step);
  const [pending, setPending] = useState<string | null>(null);

  return (
    <QuizStepFrame title={title} hint={note} className="gap-3">
      <div className="flex flex-col gap-2.5">
        {options.map((option) => (
          <OptionCard
            key={option.key}
            label={option.label}
            plain
            large
            selected={pending === option.key}
            onClick={() => {
              if (pending) return;
              save(option.key);
              setPending(option.key);
              goToNextQuizStep(router, step);
            }}
          />
        ))}
      </div>
    </QuizStepFrame>
  );
}

function ScaleStep({ step, title }: { step: ViQuizStep; title: string }) {
  const router = useRouter();
  const { save } = useAnswer(step);
  const [pending, setPending] = useState<string | null>(null);

  return (
    <QuizStepFrame title={title} className="gap-3">
      <div className="flex flex-col gap-2.5">
        {AGREE_OPTIONS.map((option) => (
          <OptionCard
            key={option.key}
            label={option.label}
            plain
            large
            selected={pending === option.key}
            onClick={() => {
              if (pending) return;
              save(option.key);
              setPending(option.key);
              goToNextQuizStep(router, step);
            }}
          />
        ))}
      </div>
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
  return (
    <QuizStepFrame pinTop>
      <div className="flex flex-col gap-3">
        <h1 className="text-[1.55rem] font-extrabold leading-tight text-forest">{right ? screen.yes : screen.retry}</h1>
        <p className="text-[1.02rem] font-semibold leading-relaxed text-slate-brand">{screen.body}</p>
      </div>
      <div className="mt-auto pt-3">
        <PrimaryButton onClick={onNext}>{screen.cta}</PrimaryButton>
      </div>
    </QuizStepFrame>
  );
}

function CheerStep({ screen, onNext }: { screen: Extract<FlowScreen, { type: 'cheer' }>; onNext: () => void }) {
  const name = useQuizStore((state) => state.data.name)?.trim() || 'bạn';
  return (
    <QuizStepFrame pinTop className="justify-center">
      <div className="flex flex-1 flex-col justify-center gap-3 text-center">
        <h1 className="text-[1.7rem] font-extrabold leading-tight text-forest">{screen.title(name)}</h1>
        <p className="text-[1.02rem] font-semibold leading-relaxed text-slate-brand">{screen.body}</p>
      </div>
      <div className="mt-auto pt-3">
        <PrimaryButton onClick={onNext}>{screen.cta}</PrimaryButton>
      </div>
    </QuizStepFrame>
  );
}

function ArchetypeStep({ onNext }: { onNext: () => void }) {
  const answers = useQuizStore((state) => state.planAnswers.answers);
  const profile = ARCHETYPES[archetypeFromAnswers(answers)];
  return (
    <QuizStepFrame pinTop>
      <div className="flex flex-col gap-3">
        <p className="text-[0.75rem] font-extrabold uppercase tracking-[0.08em] text-teal-brand">Kiểu ăn của bạn</p>
        <h1 className="text-[1.7rem] font-extrabold leading-tight text-forest">{profile.name}</h1>
        <p className="text-[1.02rem] font-semibold leading-relaxed text-slate-brand">{profile.body}</p>
      </div>
      <div className="mt-auto pt-3">
        <PrimaryButton onClick={onNext}>Hợp với mình</PrimaryButton>
      </div>
    </QuizStepFrame>
  );
}

function FlowLoader({ step, title, lines }: { step: ViQuizStep; title: string; lines: readonly string[] }) {
  const router = useRouter();
  const [shown, setShown] = useState(1);

  useEffect(() => {
    const timers = lines.map((_, index) => window.setTimeout(() => setShown(index + 1), 700 * (index + 1)));
    const done = window.setTimeout(() => goToNextQuizStep(router, step), 700 * (lines.length + 1));
    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
      window.clearTimeout(done);
    };
  }, [lines, router, step]);

  return (
    <div className="flex min-h-0 flex-1 flex-col justify-center gap-4">
      <h1 className="text-center text-[1.45rem] font-extrabold leading-tight text-forest">{title}</h1>
      <ol className="grid gap-3 rounded-[1.4rem] bg-white px-4 py-4">
        {lines.slice(0, shown).map((line) => (
          <li key={line} className="text-[0.95rem] font-semibold leading-snug text-forest">{line}</li>
        ))}
      </ol>
    </div>
  );
}
