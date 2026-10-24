export function bmi(weightKg: number, heightCm: number): number {
  const m = heightCm / 100;
  return weightKg / (m * m);
}

/** BMI to one decimal in the locale's own format: "26.0" in English, "26,0" in Vietnamese. */
export function formatBmi(value: number, locale: string): string {
  return new Intl.NumberFormat(locale === 'vi' ? 'vi-VN' : 'en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(value);
}

/**
 * Whole percentages of the parts that add up to exactly 100: each share is rounded down, then the points
 * left over go to the largest remainders. Rounding each share alone can total 99 or 101.
 */
export function wholePercents(parts: number[]): number[] {
  const total = parts.reduce((sum, part) => sum + Math.max(0, part), 0);
  if (total <= 0) return parts.map(() => 0);
  const exact = parts.map((part) => (Math.max(0, part) / total) * 100);
  const percents = exact.map(Math.floor);
  let left = 100 - percents.reduce((sum, value) => sum + value, 0);
  const byRemainder = exact.map((value, index) => ({ index, remainder: value - Math.floor(value) })).sort((a, b) => b.remainder - a.remainder);
  for (const { index } of byRemainder) {
    if (left <= 0) break;
    percents[index] += 1;
    left -= 1;
  }
  return percents;
}

export type BmiCategory = 'underweight' | 'normal' | 'overweight' | 'obese';

export function bmiCategory(value: number): BmiCategory {
  if (value < 18.5) return 'underweight';
  if (value < 25) return 'normal';
  if (value < 30) return 'overweight';
  return 'obese';
}

/** Safe weekly rates: cut -0.5 kg/wk, bulk +0.25 kg/wk. Null when not applicable. */
export function weeksToTarget(p: {
  currentKg: number;
  targetKg: number | undefined;
  goal: 'cut' | 'bulk' | 'recomp' | undefined;
}): number | null {
  if (p.targetKg == null || p.goal == null || p.goal === 'recomp') return null;
  const delta = p.targetKg - p.currentKg;
  const rate = p.goal === 'cut' ? -0.5 : 0.25;
  if (delta === 0 || Math.sign(delta) !== Math.sign(rate)) return null;
  return Math.ceil(delta / rate);
}
