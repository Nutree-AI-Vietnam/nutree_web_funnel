/** Snake_case keys match the backend / nutree_ai OnboardingData JSON fields. */
export interface OnboardingPayload {
  name?: string;
  fitness_goal?: 'cut' | 'bulk' | 'recomp';
  target_weight_kg?: number;
  pain_points?: string[];
  referral_sources?: string[];
  challenge_duration?: string;
  gender?: 'male' | 'female';
  age?: number;
  height_cm?: number;
  weight_kg?: number;
  body_fat_percentage?: number;
  training_days_per_week?: number;
  training_minutes_per_session?: number;
  experience_level?: 'beginner' | 'intermediate' | 'advanced';
  training_types?: string[];
  job_type?: 'desk' | 'on_feet' | 'physical';
  dietary_preferences?: string[];
  measurement_unit?: 'metric';
}

/** Normalized TDEE result (from API or local fallback). */
export interface TdeeResult {
  bmr: number;
  tdee: number;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

export interface Lead {
  email: string;
  web_user_id: string;
  claim_token: string;
}

export interface MomoCheckout {
  order_id: string;
  pay_url: string;
  deeplink?: string | null;
  qr_code_url?: string | null;
  status: string;
}

export interface PaymentStatus {
  order_id: string;
  status: string;
  paid: boolean;
  user_id?: string | null;
}
