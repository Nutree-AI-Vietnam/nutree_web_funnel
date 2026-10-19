/**
 * Local copy of the backend onboarding preview (TdeeCalculationService) so the
 * web shows the same targets the app gets from POST /v1/tdee/preview. Used only
 * when that request fails. Operations keep the backend's order so the rounded
 * numbers match digit for digit.
 *
 * Body fat is ignored: the quiz picker is a visual estimate and the app leaves it
 * out of the preview too, so both use Mifflin-St Jeor.
 */
import type { OnboardingPayload, TdeeResult } from '../quiz/types';
import { deriveAge } from '../quiz/dob';
import { toBackendGoal, type BackendGoal } from '../quiz/fitness-goal';
import { roundHalfEven1 } from './round-half-even';

type JobType = NonNullable<OnboardingPayload['job_type']>;
type Sex = NonNullable<OnboardingPayload['gender']>;

const JOB_TYPE_MULTIPLIER: Record<JobType, number> = { desk: 1.2, on_feet: 1.4, physical: 1.6 };
const CALORIE_ADJUSTMENT: Record<BackendGoal, number> = { cut: -300, bulk: 300, recomp: 0 };
const PROTEIN_PER_KG: Record<BackendGoal, number> = { cut: 1.8, recomp: 1.7, bulk: 1.6 };
const FAT_PER_KG: Record<BackendGoal, number> = { cut: 0.8, recomp: 0.9, bulk: 1.0 };
const FAT_MIN_SHARE: Record<BackendGoal, number> = { cut: 0.2, recomp: 0.25, bulk: 0.25 };
const MIN_CALORIES: Record<Sex, number> = { female: 1200, male: 1500 };

const MIN_PROTEIN_G = 60;
const MAX_PROTEIN_G = 300;
const MIN_FAT_G = 40;
const MAX_FAT_G = 150;
const MIN_CARBS_G = 50;
const KCAL_PER_G_PROTEIN = 4;
const KCAL_PER_G_CARBS = 4;
const KCAL_PER_G_FAT = 9;

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(value, max));

/** Targets from the quiz answers, or null while a required answer is missing. */
export function computeTdeeResult(data: OnboardingPayload): TdeeResult | null {
  const { gender, weight_kg: weight, height_cm: height, job_type: jobType } = data;
  const goal = toBackendGoal(data.fitness_goal);
  const age = deriveAge(data);
  if (!age || !gender || !weight || !height || !jobType || !goal) return null;

  const base = 10 * weight + 6.25 * height - 5 * age;
  const bmr = gender === 'male' ? base + 5 : base - 161;
  const tdee = bmr * JOB_TYPE_MULTIPLIER[jobType];

  // Never below BMR or the clinical minimum, even in a deficit.
  const calories = Math.max(tdee + CALORIE_ADJUSTMENT[goal], bmr, MIN_CALORIES[gender]);

  const protein = clamp(weight * PROTEIN_PER_KG[goal], MIN_PROTEIN_G, MAX_PROTEIN_G);
  const fatFromWeight = weight * FAT_PER_KG[goal];
  const fatFromShare = (calories * FAT_MIN_SHARE[goal]) / KCAL_PER_G_FAT;
  const fat = clamp(Math.max(fatFromWeight, fatFromShare), MIN_FAT_G, MAX_FAT_G);
  const remaining = calories - protein * KCAL_PER_G_PROTEIN - fat * KCAL_PER_G_FAT;
  const carbs = Math.max(MIN_CARBS_G, remaining / KCAL_PER_G_CARBS);

  // Calories are re-derived from the rounded grams, as the backend does.
  const protein_g = roundHalfEven1(protein);
  const carbs_g = roundHalfEven1(carbs);
  const fat_g = roundHalfEven1(fat);
  return {
    bmr: roundHalfEven1(bmr),
    tdee: roundHalfEven1(tdee),
    calories: roundHalfEven1(
      protein_g * KCAL_PER_G_PROTEIN + carbs_g * KCAL_PER_G_CARBS + fat_g * KCAL_PER_G_FAT,
    ),
    protein_g,
    carbs_g,
    fat_g,
  };
}
