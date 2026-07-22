'use client';

import { copyFor, DEFAULT_LOCALE, type Copy, type Locale } from './index';
import { useHydrated, useQuizStore } from '@/lib/quiz/store';

/**
 * Active locale for the current session.
 *
 * Before the persisted store has rehydrated we always report the default
 * locale so server and first client render agree (no hydration mismatch).
 */
export function useLocale(): Locale {
  const hydrated = useHydrated();
  const locale = useQuizStore((s) => s.locale);
  return hydrated ? locale : DEFAULT_LOCALE;
}

/** The copy tree for the active locale. Re-renders when the locale changes. */
export function useCopy(): Copy {
  return copyFor(useLocale());
}

/** Setter for the active locale (persisted via the quiz store). */
export function useSetLocale(): (locale: Locale) => void {
  return useQuizStore((s) => s.setLocale);
}
