'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { PrimaryButton } from './primary-button';
import { useCopy } from '@/lib/copy/use-copy';
import { useQuizStore } from '@/lib/quiz/store';
import { deriveAge } from '@/lib/quiz/dob';
import { QUIZ_STEPS } from '@/lib/quiz/steps';

const STORAGE_KEY = 'nutree_exit_intent_shown';
const MIN_STEP_INDEX = 3;

const encouragementMessages = [
  { emoji: '🔥', message: 'Bạn đang làm rất tốt!' },
  { emoji: '💪', message: 'Sắp hoàn thành rồi!' },
  { emoji: '✨', message: 'Chỉ còn vài bước nữa!' },
  { emoji: '🎯', message: 'Mục tiêu của bạn đang rất gần!' },
];

export function ExitIntentModal({ currentStepIndex }: { currentStepIndex: number }) {
  const setFunnelScreen = useQuizStore((state) => state.setFunnelScreen);
  const copy = useCopy();
  const data = useQuizStore((s) => s.data);
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const primaryButtonRef = useRef<HTMLButtonElement>(null);

  const stay = useCallback(() => setOpen(false), []);
  const leave = useCallback(() => {
    setOpen(false);
    setFunnelScreen('landing');
  }, [setFunnelScreen]);

  useEffect(() => {
    if (!open) return;
    const previousActiveElement = document.activeElement as HTMLElement | null;
    primaryButtonRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        stay();
        return;
      }
      if (e.key !== 'Tab') return;
      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable || focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      previousActiveElement?.focus();
    };
  }, [open, stay]);

  useEffect(() => {
    if (currentStepIndex < MIN_STEP_INDEX) return;
    if (sessionStorage.getItem(STORAGE_KEY)) return;

    const handleMouseLeave = (e: MouseEvent) => {
      if (e.clientY <= 0) {
        sessionStorage.setItem(STORAGE_KEY, '1');
        setOpen(true);
      }
    };

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      sessionStorage.setItem(STORAGE_KEY, '1');
      e.preventDefault();
    };

    document.addEventListener('mouseleave', handleMouseLeave);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [currentStepIndex]);

  const encouragement = encouragementMessages[currentStepIndex % encouragementMessages.length];
  const progress = Math.round((currentStepIndex / QUIZ_STEPS.length) * 100);
  const age = deriveAge(data);
  const name = data.name;
  const goal = data.fitness_goal;

  const goalLabel = goal
    ? copy.goal.options.find((o) => o.key === goal)?.label
    : undefined;

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
          role="presentation"
        >
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="exit-intent-title"
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
                    className="text-xs font-extrabold uppercase tracking-wider text-teal-brand"
                  >
                    {name ? `${name} ơi` : 'Bạn ơi'}
                  </motion.p>
                  <motion.h2
                    id="exit-intent-title"
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
                {age && goalLabel
                  ? `Bạn đã hoàn thành ${progress}% chặng đường. Chỉ cần thêm 1-2 phút nữa là Nutree sẽ tính xong kế hoạch ${goalLabel.toLowerCase()} cho tuổi ${age} của bạn.`
                  : `Bạn đã hoàn thành ${progress}% chặng đường. Chỉ cần thêm 1-2 phút nữa là Nutree sẽ tính xong kế hoạch riêng cho bạn.`}
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
                {[
                  { icon: '🎯', text: 'Kế hoạch calo & macro cá nhân' },
                  { icon: '🍽️', text: 'Gợi ý bữa ăn AI theo mục tiêu' },
                  { icon: '📊', text: 'Theo dõi tiến độ mỗi tuần' },
                ].map((item) => (
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
                <PrimaryButton ref={primaryButtonRef} onClick={stay}>
                  Tiếp tục ngay
                </PrimaryButton>
                <button
                  type="button"
                  onClick={leave}
                  className="min-h-11 rounded-2xl border border-border-brand bg-white px-4 py-3 text-sm font-extrabold text-muted-brand transition hover:bg-mist focus:outline-none focus-visible:ring-4 focus-visible:ring-teal-brand/20 active:scale-[0.98]"
                >
                  Tôi sẽ quay lại sau
                </button>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
