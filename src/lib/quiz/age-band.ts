import type { OnboardingPayload } from './types';

/** Representative age for each card. The quiz asks the band once; calories use this year. */
export const AGE_GROUP_YEARS = {
  '18_29': 24,
  '30_39': 34,
  '40_49': 44,
  '50_plus': 55,
} as const;

export type AgeGroup = keyof typeof AGE_GROUP_YEARS;

export function birthFromAgeGroup(group: AgeGroup, year = new Date().getFullYear()) {
  const age = AGE_GROUP_YEARS[group];
  return { age, birth_year: year - age, birth_month: 1 as const, birth_day: 1 as const };
}

export function isAgeGroup(value: unknown): value is AgeGroup {
  return typeof value === 'string' && value in AGE_GROUP_YEARS;
}

/** Fills birth fields when a saved session picked a band and never reached the old age screen. */
export function withBirthFromAgeGroup(data: OnboardingPayload): OnboardingPayload {
  if (data.birth_year != null || !isAgeGroup(data.age_group)) return data;
  return { ...data, ...birthFromAgeGroup(data.age_group) };
}
