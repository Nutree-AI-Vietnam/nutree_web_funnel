/**
 * Local TDEE fallback - TypeScript port of nutree_ai's tdee_calculator.dart
 * + macro_calculation_constants.dart. Used only when POST /v1/tdee/preview fails.
 */
import type { OnboardingPayload, TdeeResult } from '../quiz/types';

type Sex = 'male' | 'female';
type Goal = 'cut' | 'bulk' | 'recomp';
type JobType = 'desk' | 'on_feet' | 'physical';
type TrainingLevel = 'beginner' | 'intermediate' | 'advanced';

const JOB_TYPE_MULTIPLIER: Record<JobType, number> = {
  desk: 1.2,
  on_feet: 1.4,
  physical: 1.6,
};

const PROTEIN_PER_KG_BY_GOAL: Record<Goal, number> = { cut: 2.2, recomp: 2.0, bulk: 2.0 };

const PROTEIN_PER_KG_BY_TRAINING: Record<Goal, Record<TrainingLevel, number>> = {
  cut: { beginner: 2.2, intermediate: 2.2, advanced: 2.2 },
  recomp: { beginner: 1.8, intermediate: 2.0, advanced: 2.2 },
  bulk: { beginner: 1.8, intermediate: 2.0, advanced: 2.2 },
};

const FAT_PER_KG_BY_GOAL: Record<Goal, number> = { cut: 0.8, recomp: 0.9, bulk: 1.0 };
const FAT_MIN_PERCENT_BY_GOAL: Record<Goal, number> = { cut: 0.2, recomp: 0.25, bulk: 0.25 };

const MIN_PROTEIN_G = 60;
const MAX_PROTEIN_G = 300;
const MIN_FAT_G = 40;
const MAX_FAT_G = 150;
const MIN_CARBS_G = 50;
const KCAL_PER_G_PROTEIN = 4;
const KCAL_PER_G_CARBS = 4;
const KCAL_PER_G_FAT = 9;
const KATCH_MCARDLE_BASE = 370;
const KATCH_MCARDLE_LBM_MULTIPLIER = 21.6;

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);

export function calculateBmr(p: {
  age: number;
  sex: Sex;
  weightKg: number;
  heightCm: number;
  bodyFatPercentage?: number;
}): number {
  if (p.bodyFatPercentage != null) {
    const lbm = p.weightKg * (1 - p.bodyFatPercentage / 100);
    return KATCH_MCARDLE_BASE + KATCH_MCARDLE_LBM_MULTIPLIER * lbm;
  }
  const base = 10 * p.weightKg + 6.25 * p.heightCm - 5 * p.age;
  return p.sex === 'male' ? base + 5 : base - 161;
}

export function calculateTdee(p: {
  age: number;
  sex: Sex;
  weightKg: number;
  heightCm: number;
  jobType: JobType;
  bodyFatPercentage?: number;
}): number {
  return calculateBmr(p) * JOB_TYPE_MULTIPLIER[p.jobType];
}

export function calculateMacros(p: {
  tdee: number;
  goal: Goal;
  weightKg: number;
  trainingLevel?: TrainingLevel;
}): { calories: number; protein_g: number; carbs_g: number; fat_g: number } {
  const calories = p.goal === 'cut' ? p.tdee - 500 : p.goal === 'bulk' ? p.tdee + 300 : p.tdee;

  const proteinMultiplier = p.trainingLevel
    ? PROTEIN_PER_KG_BY_TRAINING[p.goal][p.trainingLevel]
    : PROTEIN_PER_KG_BY_GOAL[p.goal];
  const protein_g = clamp(p.weightKg * proteinMultiplier, MIN_PROTEIN_G, MAX_PROTEIN_G);

  const fatFromWeight = p.weightKg * FAT_PER_KG_BY_GOAL[p.goal];
  const fatFromPercent = (calories * FAT_MIN_PERCENT_BY_GOAL[p.goal]) / KCAL_PER_G_FAT;
  const fat_g = clamp(Math.max(fatFromWeight, fatFromPercent), MIN_FAT_G, MAX_FAT_G);

  const remaining = calories - protein_g * KCAL_PER_G_PROTEIN - fat_g * KCAL_PER_G_FAT;
  const carbs_g = Math.max(remaining / KCAL_PER_G_CARBS, MIN_CARBS_G);

  return { calories, protein_g, carbs_g, fat_g };
}

/** Full fallback from the quiz payload. Null if required fields are missing. */
export function computeTdeeResult(data: OnboardingPayload): TdeeResult | null {
  const { age, gender, weight_kg, height_cm, job_type, fitness_goal } = data;
  if (!age || !gender || !weight_kg || !height_cm || !job_type || !fitness_goal) return null;

  const bmr = calculateBmr({
    age,
    sex: gender,
    weightKg: weight_kg,
    heightCm: height_cm,
    bodyFatPercentage: data.body_fat_percentage,
  });
  const tdee = bmr * JOB_TYPE_MULTIPLIER[job_type];
  const macros = calculateMacros({
    tdee,
    goal: fitness_goal,
    weightKg: weight_kg,
    trainingLevel: data.experience_level,
  });
  return { bmr, tdee, ...macros };
}
