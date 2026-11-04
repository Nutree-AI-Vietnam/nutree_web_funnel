'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { PrimaryButton } from './primary-button';
import { useCopy, useLocale } from '@/lib/copy/use-copy';
import { returnToFunnelStart } from '@/lib/quiz/navigation';
import { useQuizStore } from '@/lib/quiz/store';
import { deriveAge } from '@/lib/quiz/dob';
import { quizStepsFor } from '@/lib/quiz/steps';

const STORAGE_KEY = 'nutree_exit_intent_shown';
const MIN_STEP_INDEX = 3;
/** Long enough that a tab or window switch blurs before the sheet opens. */
const OPEN_DELAY_MS = 400;
/** Clicking the address bar blurs the window, then the pointer often leaves through the top edge. Chrome can still report document.hasFocus() as true. */
const BLUR_GUARD_MS = 1000;

export function ExitIntentModal({ currentStepIndex }: { currentStepIndex: number }) {
  const copy = useCopy();
  const locale = useLocale();
  const data = useQuizStore((s) => s.data);
  const [open, setOpen] = useState(false);
  const openRef = useRef(false);
  useEffect(() => {
    openRef.current = open;
  }, [open]);

  useEffect(() => {
    if (currentStepIndex < MIN_STEP_INDEX) return;
    if (sessionStorage.getItem(STORAGE_KEY)) return;

    let timer: number | undefined;
    let distractedUntil = 0;
    const clearTimer = () => {
      if (timer != null) window.clearTimeout(timer);
      timer = undefined;
    };
    const noteDistraction = () => {
      distractedUntil = Date.now() + BLUR_GUARD_MS;
      clearTimer();
    };
    const distracted = () => Date.now() < distractedUntil || !document.hasFocus() || document.visibilityState === 'hidden';
    const show = () => {
      timer = undefined;
      if (distracted()) return;
      sessionStorage.setItem(STORAGE_KEY, '1');
      setOpen(true);
    };
    // Leaving through the top of the page is also what a second tab or window does.
    // Opening immediately puts this sheet on top of Tiếp tục, so the last screen looks stuck.
    // mouseout covers browsers that leave the window without a document mouseleave.
    const handlePointerLeave = (event: MouseEvent) => {
      if (event.relatedTarget instanceof Node && document.documentElement.contains(event.relatedTarget)) return;
      if (distracted()) return;
      if (event.clientY > 0) return;
      clearTimer();
      timer = window.setTimeout(show, OPEN_DELAY_MS);
    };
    const cancelPending = () => clearTimer();
    const handleVisibility = () => {
      if (document.visibilityState !== 'hidden') return;
      noteDistraction();
      // The sheet was never answered. A hidden tab should not leave it on Tiếp tục, or spend the one prompt.
      if (!openRef.current) return;
      sessionStorage.removeItem(STORAGE_KEY);
      setOpen(false);
    };

    document.addEventListener('mouseleave', handlePointerLeave);
    document.addEventListener('mouseout', handlePointerLeave);
    document.addEventListener('mouseenter', cancelPending);
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('blur', noteDistraction);

    return () => {
      clearTimer();
      document.removeEventListener('mouseleave', handlePointerLeave);
      document.removeEventListener('mouseout', handlePointerLeave);
      document.removeEventListener('mouseenter', cancelPending);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('blur', noteDistraction);
    };
  }, [currentStepIndex]);

  const encouragement = copy.exitIntent.messages[currentStepIndex % copy.exitIntent.messages.length];
  const progress = Math.round((currentStepIndex / quizStepsFor(locale).length) * 100);
  // A band stores a midpoint (18–29 → 24) for calories. The sheet should name the range the visitor picked.
  const rangeLabel = copy.ageGroup.options.find((option) => option.key === data.age_group)?.label;
  const typedAge = rangeLabel ? null : deriveAge(data);
  const ageLabel = rangeLabel ?? (typedAge != null ? String(typedAge) : null);
  const name = data.name;
  const goal = data.fitness_goal;

  const goalLabel = goal
    ? copy.goal.options.find((o) => o.key === goal)?.label
    : undefined;

  const stay = () => setOpen(false);
  const leave = () => {
    setOpen(false);
    returnToFunnelStart();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center"
          onClick={stay}
        >
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className="mx-4 w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl"
          >
            {/* Progress indicator at top */}
            <div className="relative h-1.5 bg-forest/10">
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-forest to-teal-brand transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>

            <div className="p-6">
              {/* Header with animated emoji */}
              <div className="mb-4 flex items-center gap-3">
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', damping: 15, stiffness: 200, delay: 0.1 }}
                  className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-teal-brand/20 to-forest/10"
                >
                  <span className="text-3xl">{encouragement.emoji}</span>
                </motion.div>
                <div>
                  <motion.p
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.15 }}
                    className="ph-mask text-xs font-extrabold tracking-[0.02em] text-teal-brand"
                  >
                    {name ? copy.exitIntent.greetingNamed(name) : copy.exitIntent.greeting}
                  </motion.p>
                  <motion.h2
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                    className="text-xl font-extrabold leading-tight text-forest"
                  >
                    {encouragement.message}
                  </motion.h2>
                </div>
              </div>

              {/* Personalized message */}
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="mb-4 text-sm font-semibold leading-relaxed text-slate-brand"
              >
                {ageLabel && goalLabel
                  ? copy.exitIntent.bodyWithGoal(progress, goalLabel, ageLabel)
                  : copy.exitIntent.body(progress)}
              </motion.p>

              {/* Benefits list with staggered animation */}
              <motion.div
                initial="hidden"
                animate="visible"
                variants={{
                  hidden: {},
                  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.3 } },
                }}
                className="mb-5 grid gap-2"
              >
                {copy.exitIntent.benefits.map((item) => (
                  <motion.div
                    key={item.text}
                    variants={{
                      hidden: { opacity: 0, x: -15 },
                      visible: { opacity: 1, x: 0 },
                    }}
                    className="flex items-center gap-3 rounded-xl bg-bg-brand px-3 py-2.5"
                  >
                    <span className="text-lg">{item.icon}</span>
                    <span className="text-sm font-semibold text-forest">{item.text}</span>
                  </motion.div>
                ))}
              </motion.div>

              {/* Action buttons */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="grid gap-2"
              >
                <PrimaryButton onClick={stay}>
                  {copy.exitIntent.stay}
                </PrimaryButton>
                <button
                  type="button"
                  onClick={leave}
                  className="min-h-11 rounded-2xl border border-border-brand bg-white px-4 py-3 text-sm font-extrabold text-muted-brand transition hover:bg-mist focus:outline-none focus-visible:ring-4 focus-visible:ring-teal-brand/20 active:scale-[0.98]"
                >
                  {copy.exitIntent.leave}
                </button>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
