'use client';

import { createContext, createElement, useContext, type ReactNode } from 'react';
import { copyFor, DEFAULT_LOCALE, type Copy, type Locale } from './index';
import { useHydrated, useQuizStore } from '@/lib/quiz/store';

const RouteLocaleContext = createContext<Locale | null>(null);

/** Route language for the server render and the hydration render. */
export function RouteLocaleProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  return createElement(RouteLocaleContext.Provider, { value: locale }, children);
}

/**
 * Active locale for the current session.
 *
 * Before the persisted store has rehydrated, use the route language when the
 * page provides one, otherwise the default. Server and hydration renders then
 * agree, and a saved locale cannot change the first paint.
 */
export function useLocale(): Locale {
  const hydrated = useHydrated();
  const routeLocale = useContext(RouteLocaleContext);
  const locale = useQuizStore((s) => s.locale);
  if (!hydrated) return routeLocale ?? DEFAULT_LOCALE;
  return locale;
}

/** The copy tree for the active locale. Re-renders when the locale changes. */
export function useCopy(): Copy {
  return copyFor(useLocale());
}

/** Setter for the active locale (persisted via the quiz store). */
export function useSetLocale(): (locale: Locale) => void {
  return useQuizStore((s) => s.setLocale);
}
