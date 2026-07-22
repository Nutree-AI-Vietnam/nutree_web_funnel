/**
 * Copy registry + locale plumbing.
 *
 * Adding a language is a ONE-STEP change:
 *   1. Create `src/lib/copy/<locale>.ts` exporting `const <locale>: Copy = { ... }`
 *      (typed as `Copy`, so the compiler forces you to translate every key), then
 *      add it to the `locales` / `LOCALE_LABELS` maps below.
 *
 * `vi.ts` is the source-of-truth *shape*; every other locale must satisfy `Copy`,
 * which is derived from `typeof vi` (see `Widen` below).
 */
import { vi } from './vi';
import { en } from './en';

/**
 * `vi` is declared `as const`, so `typeof vi` is a tree of *literal* types
 * (e.g. `'Tiếp tục'`). A translation can't reuse those literals, so we widen
 * literals back to their base types while preserving structure, function
 * signatures, and array element shapes. The result is the contract every
 * locale module must satisfy.
 */
type Widen<T> = T extends (...args: infer A) => infer R
  ? (...args: A) => R
  : T extends readonly (infer U)[]
    ? readonly Widen<U>[]
    : T extends string
      ? string
      : T extends number
        ? number
        : T extends boolean
          ? boolean
          : T extends object
            ? { -readonly [K in keyof T]: Widen<T[K]> }
            : T;

/** The full copy contract. Every locale module is typed as `Copy`. */
export type Copy = Widen<typeof vi>;

/** Every supported locale. Extend this map to add a language. */
export const locales = { vi, en } satisfies Record<string, Copy>;

export type Locale = keyof typeof locales;

/** Order the switcher renders locales in. */
export const LOCALE_ORDER: readonly Locale[] = ['vi', 'en'];

/** Short labels shown on the language toggle. */
export const LOCALE_LABELS: Record<Locale, string> = { vi: 'VI', en: 'EN' };

/** Accessible names for the language toggle (used in aria-labels). */
export const LOCALE_NAMES: Record<Locale, string> = {
  vi: 'Tiếng Việt',
  en: 'English',
};

export const DEFAULT_LOCALE: Locale = 'vi';

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && value in locales;
}

/** Returns the copy tree for a locale (falls back to the default). */
export function copyFor(locale: Locale): Copy {
  return locales[locale] ?? locales[DEFAULT_LOCALE];
}

export { vi, en };
