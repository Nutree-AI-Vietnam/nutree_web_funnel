'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { NutreeLogo } from '@/components/nutree-logo';
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
  description,
  hint,
  options,
  replies,
  ctaLabel,
}: {
  step: QuizStep;
  field: ArrayField;
  question: string;
  description?: string;
  hint?: string;
  options: ReadonlyArray<{ readonly key: string; readonly label: string; readonly icon?: string }>;
  /** A one-line reply to the latest pick, per option key. */
  replies?: Readonly<Record<string, string>>;
  /** Overrides the button label; defaults to Continue. */
  ctaLabel?: string;
}) {
  const vi = useCopy();
  const router = useRouter();
  const reduce = useReducedMotion();
  const values = useQuizStore((s) => s.data[field]) ?? [];
  const setData = useQuizStore((s) => s.setData);
  const lastKey = values[values.length - 1];
  const reply = replies && lastKey ? replies[lastKey] : undefined;
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
      description={description}
      hint={hint}
      className={cn(compact ? 'gap-2' : 'gap-3')}
      titleClassName={compact ? 'text-[1.7rem]' : undefined}
    >
      <div className={cn(twoColumn ? 'grid grid-cols-2 gap-2' : 'flex flex-col', compact ? 'gap-2' : 'gap-2.5')}>
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
        {/* The slot is there from the first frame so the list does not jump on the first pick; replies share one cell and cross-fade. */}
        {replies && (
          <div role="status" aria-live="polite" className="mb-2.5 grid min-h-[2.375rem]">
            <AnimatePresence initial={false}>
              {reply && (
                <motion.p
                  key={lastKey}
                  className="[grid-area:1/1] rounded-2xl bg-emerald-50 px-3.5 py-2.5 text-[13px] font-semibold leading-snug text-emerald-900"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: reduce ? 0 : 0.15, ease: 'easeOut' }}
                >
                  {reply}
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        )}
        <PrimaryButton ref={triggerRef} disabled={values.length === 0} onClick={continueToNext}>
          {ctaLabel ?? vi.common.continue}
        </PrimaryButton>
      </div>
      {/* Portaled to the body so the blur covers the whole screen, not just the quiz frame (a transformed parent traps fixed elements). */}
      {showCareModal && typeof document !== 'undefined' && createPortal(
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-[80] grid place-items-center bg-[rgb(16_39_32_/_0.35)] px-5 py-6 backdrop-blur-md" role="presentation">
          <motion.section
            initial={reduce ? false : { opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="care-modal-title"
            className="w-full max-w-md rounded-[2rem] bg-white p-6 shadow-[0_28px_90px_rgb(16_39_32_/_0.25)]"
          >
            <NutreeLogo className="mx-auto h-16 w-16" />
            <h2 id="care-modal-title" className="mt-5 text-center text-2xl font-extrabold leading-tight text-forest">{vi.careModal.title}</h2>
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
          </motion.section>
        </motion.div>,
        document.body,
      )}
    </QuizStepFrame>
  );
}
