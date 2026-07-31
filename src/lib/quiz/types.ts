/** Snake_case keys match the backend / nutree_ai OnboardingData JSON fields. */
export interface OnboardingPayload {
  name?: string;
  fitness_goal?: 'cut' | 'bulk' | 'recomp' | 'maintain';
  target_weight_kg?: number;
  target_weight_unsure?: boolean;
  pain_points?: string[];
  challenge_duration?: string;
  motivation?: 'confidence' | 'energy' | 'health' | 'clothes' | 'training' | 'clarity';
  hardest_eating_moment?: 'morning' | 'lunch' | 'evening' | 'late_night' | 'weekend' | 'eating_out';
  gender?: 'male' | 'female';
  age?: number;
  height_cm?: number;
  weight_kg?: number;
  body_review_confirmed_at?: string;
  body_fat_percentage?: number;
  training_days_per_week?: number;
  training_minutes_per_session?: number;
  job_type?: 'desk' | 'on_feet' | 'physical';
  dietary_preferences?: string[];
  support_style?: 'simple' | 'flexible' | 'detailed' | 'gentle';
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
  lead_id: string;
  masked_email?: string;
  claim_token?: string;
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

export type Market = 'VN' | 'INTL';
export type PaymentProvider = 'MOMO' | 'PAYPAL';
export type Currency = 'VND' | 'USD';

export interface WelcomeReward {
  id?: string;
  code: 'WELCOME50';
  status: 'RESERVED' | 'REVEALED' | 'REDEEMED' | 'EXPIRED';
  discount_percent: 50;
  price_locked_while_active?: boolean;
}

export interface FunnelOffer {
  id: string;
  market: Market;
  provider: PaymentProvider;
  currency: Currency;
  label: string;
  description: string;
  period_unit: 'MONTH' | 'YEAR';
  period_count: number;
  standard_amount: number;
  welcome_amount: number;
  amount_due_today: number;
  renewal_amount: number;
  renewal_description: string;
  next_billing_date: string;
  reward_id: string | null;
  reward_applied: boolean;
  price_locked_while_active: boolean;
  recommended: boolean;
  provider_plan_id: string;
}

export interface FunnelContext {
  session_id: string;
  detected_country: string;
  billing_country: string;
  country_source: string;
  market: Market;
  locale: 'vi' | 'en';
  provider: PaymentProvider;
  currency: Currency;
  welcome_reward: WelcomeReward;
  offers: FunnelOffer[];
}

export interface CheckoutResponse {
  checkoutId: string;
  provider: PaymentProvider;
  countryCode: string;
  currency: Currency;
  offerId: string;
  rewardId: string;
  rewardApplied: true;
  discountPercent: 50;
  standardAmount: number;
  amountDueToday: number;
  renewalAmount: number;
  renewalDescription: string;
  nextBillingDate: string;
  priceLockedWhileActive: true;
  status: 'CREATED' | 'PENDING_APPROVAL' | 'PENDING_PAYMENT';
  momo?: {
    orderId: string;
    payUrl: string;
    deeplink: string | null;
    qrCodeUrl: string | null;
  };
  paypal?: {
    planId: string;
    customId: string;
  };
}
