export type BillingPeriod = 'month' | 'year';

export interface Tier {
  name: 'Starter' | 'Pro' | 'Advanced';
  description: string;
  features: string[];
  priceId: { month: string; year: string };
  badge?: string;
}

const PADDLE_PRICES = {
  starterMonthly: 'pri_01kyv9cd2z7r1fw68z2cx6ppm8',
  starterAnnual: 'pri_01kyv9cddctq4fg2rrnts65nkj',
  proMonthly: 'pri_01kyv9ce1zethf3czs0zrt8yf6',
  proAnnual: 'pri_01kyv9cebfpga5pqy2wn4ecdz2',
  advancedMonthly: 'pri_01kyv9cf24hnmv1xebebkdp94g',
  advancedAnnual: 'pri_01kyv9cfdckntqeww28651zhsj',
} as const;

export const pricingTiers: Tier[] = [
  {
    name: 'Starter',
    description: 'For trying Nutree with the core nutrition plan.',
    features: [
      'Personal calorie and macro targets',
      'AI meal logging support',
      'Progress dashboard',
      'Basic meal guidance',
    ],
    priceId: {
      month: PADDLE_PRICES.starterMonthly,
      year: PADDLE_PRICES.starterAnnual,
    },
  },
  {
    name: 'Pro',
    description: 'Best fit for people ready to build a real nutrition rhythm.',
    badge: 'Best value',
    features: [
      'Everything in Starter',
      'Richer meal guidance and habit support',
      'Meal recommendation workflow',
      'Priority onboarding guidance',
    ],
    priceId: {
      month: PADDLE_PRICES.proMonthly,
      year: PADDLE_PRICES.proAnnual,
    },
  },
  {
    name: 'Advanced',
    description: 'For consistent tracking with the full Nutree premium experience.',
    features: [
      'Everything in Pro',
      'Advanced nutrition insights',
      'Long-term consistency tracking',
      'Premium support readiness',
    ],
    priceId: {
      month: PADDLE_PRICES.advancedMonthly,
      year: PADDLE_PRICES.advancedAnnual,
    },
  },
];
