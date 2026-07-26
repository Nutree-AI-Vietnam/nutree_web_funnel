import type { Currency, FunnelContext, FunnelOffer, Market, PaymentProvider, WelcomeReward } from '@/lib/quiz/types';

export function resolveMarket(countryCode: string | undefined): {
  market: Market;
  provider: PaymentProvider;
  currency: Currency;
} {
  if (countryCode?.toUpperCase() === 'VN') {
    return { market: 'VN', provider: 'MOMO', currency: 'VND' };
  }
  return { market: 'INTL', provider: 'PAYPAL', currency: 'USD' };
}

const nextBillingDate = () => {
  const date = new Date();
  date.setMonth(date.getMonth() + 3);
  return date.toISOString();
};

const reward: WelcomeReward = {
  id: 'rw_welcome50_preview',
  code: 'WELCOME50',
  status: 'REVEALED',
  discount_percent: 50,
  price_locked_while_active: true,
};

const vnOffers = (rewardId: string | null): FunnelOffer[] => [
  {
    id: 'vn_monthly_welcome50',
    market: 'VN',
    provider: 'MOMO',
    currency: 'VND',
    label: '4 tuần',
    description: 'Linh hoạt trong 4 tuần đầu',
    period_unit: 'MONTH',
    period_count: 1,
    standard_amount: 198_000,
    welcome_amount: 99_000,
    amount_due_today: 99_000,
    renewal_amount: 99_000,
    renewal_description: '99.000đ mỗi 4 tuần',
    next_billing_date: nextBillingDate(),
    reward_id: rewardId,
    reward_applied: true,
    price_locked_while_active: true,
    recommended: false,
    provider_plan_id: 'momo_monthly_welcome50',
  },
  {
    id: 'vn_quarterly_welcome50',
    market: 'VN',
    provider: 'MOMO',
    currency: 'VND',
    label: '12 tuần',
    description: 'Đủ 12 tuần để tạo nhịp theo dõi',
    period_unit: 'MONTH',
    period_count: 3,
    standard_amount: 498_000,
    welcome_amount: 249_000,
    amount_due_today: 249_000,
    renewal_amount: 249_000,
    renewal_description: '249.000đ mỗi 12 tuần',
    next_billing_date: nextBillingDate(),
    reward_id: rewardId,
    reward_applied: true,
    price_locked_while_active: true,
    recommended: true,
    provider_plan_id: 'momo_quarterly_welcome50',
  },
  {
    id: 'vn_semiannual_welcome50',
    market: 'VN',
    provider: 'MOMO',
    currency: 'VND',
    label: '52 tuần',
    description: 'Theo dõi trọn 52 tuần, ít gián đoạn hơn',
    period_unit: 'YEAR',
    period_count: 1,
    standard_amount: 1_198_000,
    welcome_amount: 599_000,
    amount_due_today: 599_000,
    renewal_amount: 599_000,
    renewal_description: '599.000đ mỗi 52 tuần',
    next_billing_date: nextBillingDate(),
    reward_id: rewardId,
    reward_applied: true,
    price_locked_while_active: true,
    recommended: false,
    provider_plan_id: 'momo_semiannual_welcome50',
  },
];

const intlOffers = (rewardId: string | null): FunnelOffer[] => [
  {
    id: 'intl_monthly_welcome50',
    market: 'INTL',
    provider: 'PAYPAL',
    currency: 'USD',
    label: '4-week',
    description: 'Start with 4-week flexibility',
    period_unit: 'MONTH',
    period_count: 1,
    standard_amount: 9.98,
    welcome_amount: 4.99,
    amount_due_today: 4.99,
    renewal_amount: 4.99,
    renewal_description: '$4.99 every 4 weeks',
    next_billing_date: nextBillingDate(),
    reward_id: rewardId,
    reward_applied: true,
    price_locked_while_active: true,
    recommended: false,
    provider_plan_id: 'paypal_monthly_welcome50',
  },
  {
    id: 'intl_quarterly_welcome50',
    market: 'INTL',
    provider: 'PAYPAL',
    currency: 'USD',
    label: '12-week',
    description: 'Recommended for a full 12-week rhythm',
    period_unit: 'MONTH',
    period_count: 3,
    standard_amount: 19.98,
    welcome_amount: 9.99,
    amount_due_today: 9.99,
    renewal_amount: 9.99,
    renewal_description: '$9.99 every 12 weeks',
    next_billing_date: nextBillingDate(),
    reward_id: rewardId,
    reward_applied: true,
    price_locked_while_active: true,
    recommended: true,
    provider_plan_id: 'paypal_quarterly_welcome50',
  },
  {
    id: 'intl_yearly_welcome50',
    market: 'INTL',
    provider: 'PAYPAL',
    currency: 'USD',
    label: '52-week',
    description: 'Best for 52 weeks of consistency',
    period_unit: 'YEAR',
    period_count: 1,
    standard_amount: 39.98,
    welcome_amount: 19.99,
    amount_due_today: 19.99,
    renewal_amount: 19.99,
    renewal_description: '$19.99 every 52 weeks',
    next_billing_date: nextBillingDate(),
    reward_id: rewardId,
    reward_applied: true,
    price_locked_while_active: true,
    recommended: false,
    provider_plan_id: 'paypal_yearly_welcome50',
  },
];

export function createFallbackFunnelContext(countryCode = 'VN'): FunnelContext {
  const { market, provider, currency } = resolveMarket(countryCode);
  const offers = market === 'VN' ? vnOffers(reward.id ?? null) : intlOffers(reward.id ?? null);
  return {
    session_id: 'fs_local_preview',
    detected_country: countryCode,
    billing_country: countryCode,
    country_source: 'development_fallback',
    market,
    locale: market === 'VN' ? 'vi' : 'en',
    provider,
    currency,
    welcome_reward: reward,
    offers,
  };
}

export function formatOfferAmount(amount: number, currency: Currency): string {
  if (currency === 'VND') {
    return `${amount.toLocaleString('vi-VN')}đ`;
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(amount);
}

export function getRecommendedOffer(offers: FunnelOffer[]): FunnelOffer {
  const offer = offers.find((item) => item.recommended) ?? offers[0];
  if (!offer) throw new Error('No funnel offers available');
  return offer;
}
