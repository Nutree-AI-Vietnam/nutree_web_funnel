import type { OnboardingPayload } from './types';

export type BirthDate = Pick<OnboardingPayload, 'birth_year' | 'birth_month' | 'birth_day'>;

function isCalendarDate(value: BirthDate): boolean {
  const { birth_year: year, birth_month: month, birth_day: day } = value;
  if (typeof year !== 'number' || typeof month !== 'number' || typeof day !== 'number' || !Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return false;
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function deriveAge(value: BirthDate & { age?: number }, today = new Date()): number | null {
  if (typeof value.age === 'number' && Number.isInteger(value.age)) return value.age;
  if (!isCalendarDate(value)) return null;
  const year = value.birth_year!;
  const month = value.birth_month!;
  const day = value.birth_day!;
  let age = today.getUTCFullYear() - year;
  if (today.getUTCMonth() + 1 < month || (today.getUTCMonth() + 1 === month && today.getUTCDate() < day)) age -= 1;
  return age;
}

export function validateAge(age: number): boolean {
  return Number.isInteger(age) && age >= 12 && age <= 100;
}

export function validateBirthDate(value: BirthDate, today = new Date()): { valid: boolean; age?: number } {
  const age = deriveAge(value, today);
  return age != null && age >= 12 && age <= 100 ? { valid: true, age } : { valid: false };
}
