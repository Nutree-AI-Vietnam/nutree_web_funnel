'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { OptionCard } from '@/components/option-card';
import { PrimaryButton } from '@/components/primary-button';
import { useCopy } from '@/lib/copy/use-copy';
import { goToNextQuizStep } from '@/lib/quiz/navigation';
import type { QuizStep } from '@/lib/quiz/steps';
import { useQuizStore } from '@/lib/quiz/store';
import type { OnboardingPayload } from '@/lib/quiz/types';
import { cn } from '@/lib/utils';
import { QuizStepFrame } from './quiz-step-frame';

type ArrayField = 'pain_points' | 'dietary_preferences';

export function MultiChoiceStep({
  step,
  field,
  question,
  hint,
  options,
}: {
  step: QuizStep;
  field: ArrayField;
  question: string;
  hint?: string;
  options: ReadonlyArray<{ readonly key: string; readonly label: string; readonly icon?: string }>;
}) {
  const vi = useCopy();
  const router = useRouter();
  const values = useQuizStore((s) => s.data[field]) ?? [];
  const setData = useQuizStore((s) => s.setData);
  const compact = options.length > 6;
  const twoColumn = field === 'dietary_preferences';
  const [showCareModal, setShowCareModal] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const modalConfirmRef = useRef<HTMLButtonElement>(null);

  const closeCareModal = useCallback(() => {
    setShowCareModal(false);
    window.setTimeout(() => triggerRef.current?.focus(), 0);
  }, []);

  useEffect(() => {
    if (!showCareModal) return;
    modalConfirmRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeCareModal();
        return;
      }
      if (event.key !== 'Tab') return;
      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [closeCareModal, showCareModal]);

  const toggle = (key: string) => {
    let next = values.includes(key) ? values.filter((v) => v !== key) : [...values, key];
    if (field === 'pain_points') next = next.slice(-2);
    if (field === 'dietary_preferences') {
      next = key === 'none' && !values.includes('none')
        ? ['none']
        : next.filter((v) => v !== 'none').slice(-2);
    }
    setData({ [field]: next } as Partial<OnboardingPayload>);
  };

  const continueToNext = () => {
    const cautionaryChoices = ['gluten_free', 'dairy_free', 'nut_free', 'egg_free', 'shellfish_free'];
    if (field === 'dietary_preferences' && values.some((value) => cautionaryChoices.includes(value))) {
      setShowCareModal(true);
      return;
    }
    goToNextQuizStep(router, step);
  };

  return (
    <QuizStepFrame
      title={question}
      hint={hint}
      className={cn(compact ? 'gap-2' : 'gap-3')}
      titleClassName={compact ? 'text-[1.65rem]' : undefined}
    >
      <div className={cn(twoColumn ? 'grid grid-cols-2 gap-2' : 'flex flex-col', compact ? 'gap-2' : 'gap-3')}>
        {options.map((o) => (
          <OptionCard
            key={o.key}
            label={o.label}
            icon={o.icon}
            compact={compact}
            selected={values.includes(o.key)}
            onClick={() => toggle(o.key)}
          />
        ))}
      </div>
      <div className={cn('mt-auto', compact ? 'pt-3' : 'pt-6')}>
        <PrimaryButton ref={triggerRef} disabled={values.length === 0} onClick={continueToNext}>
          {vi.common.continue}
        </PrimaryButton>
      </div>
      {showCareModal && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 px-5 py-6 backdrop-blur-sm" role="presentation">
          <section
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="care-modal-title"
            className="w-full max-w-md rounded-[2rem] bg-white p-6 shadow-[0_28px_90px_rgb(16_39_32_/_0.25)]"
          >
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-teal-brand/12">
              <span aria-hidden="true" className="block h-8 w-5 -rotate-45 rounded-[100%_0_100%_0] bg-teal-brand" />
            </div>
            <p className="mt-5 text-center text-xs font-extrabold uppercase tracking-[0.14em] text-teal-brand">{vi.careModal.eyebrow}</p>
            <h2 id="care-modal-title" className="mt-3 text-center text-2xl font-extrabold leading-tight text-forest">{vi.careModal.title}</h2>
            <p className="mt-4 text-center text-base font-semibold leading-relaxed text-muted-brand">{vi.careModal.body}</p>
            <p className="mt-4 text-center text-sm font-medium leading-relaxed text-muted-brand">{vi.careModal.disclaimer}</p>
            <PrimaryButton
              ref={modalConfirmRef}
              onClick={() => {
                closeCareModal();
                goToNextQuizStep(router, step);
              }}
              className="mt-6"
            >
              {vi.careModal.cta}
            </PrimaryButton>
            <button
              type="button"
              onClick={closeCareModal}
              className="mt-3 min-h-11 w-full rounded-2xl px-4 text-sm font-extrabold text-muted-brand transition hover:bg-mist focus:outline-none focus-visible:ring-4 focus-visible:ring-teal-brand/20"
            >
              {vi.careModal.editCta}
            </button>
          </section>
        </div>
      )}
    </QuizStepFrame>
  );
}
