export function bmi(weightKg: number, heightCm: number): number {
  const m = heightCm / 100;
  return weightKg / (m * m);
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
