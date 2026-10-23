'use client';

import { useEffect } from 'react';
import { useLocale } from '@/lib/copy/use-copy';
import { useHydrated, useQuizStore } from './store';
import { resolveUnitSystem, unitSystemOptions, type UnitSystem } from './units';

/**
 * The body units the visitor reads and types: their pick, else the default for their
 * country. English only, so the Vietnamese funnel always resolves to metric with no switch.
 */
export function useUnits(): { system: UnitSystem; options: UnitSystem[]; setSystem: (units: UnitSystem) => void } {
  const locale = useLocale();
  const units = useQuizStore((s) => s.units);
  const countryCode = useQuizStore((s) => s.countryCode);
  const setSystem = useQuizStore((s) => s.setUnits);
  return {
    system: resolveUnitSystem(units, locale, countryCode),
    options: unitSystemOptions(locale, countryCode),
    setSystem,
  };
}

/**
 * Remembers the visitor's country from the request once the tab's saved state has loaded,
 * unless the tab already has one.
 */
export function useSeedCountry(countryCode: string | undefined): void {
  const hydrated = useHydrated();
  const saved = useQuizStore((s) => s.countryCode);
  const setCountryCode = useQuizStore((s) => s.setCountryCode);
  useEffect(() => {
    if (hydrated && countryCode && !saved) setCountryCode(countryCode);
  }, [countryCode, hydrated, saved, setCountryCode]);
}
