import type { Period, Product } from '@revenuecat/purchases-js';

const DAYS_PER_UNIT: Record<Period['unit'], number> = {
  day: 1,
  week: 7,
  month: 365 / 12,
  year: 365,
};

export interface PlanPerDay {
  amount: number;
  currency: string;
}

export function periodInDays(period: Period | null | undefined): number | null {
  if (!period || !Number.isFinite(period.number) || period.number <= 0) return null;
  const perUnit = DAYS_PER_UNIT[period.unit];
  return perUnit ? period.number * perUnit : null;
}

/**
 * Approximate cost per day of the first payment shown on the paywall:
 * the intro price when RevenueCat has one, otherwise the base price, after the offer discount.
 */
export function planPerDay(product: Product | null | undefined, discountPercent = 0): PlanPerDay | null {
  if (!product || discountPercent < 0 || discountPercent > 100) return null;
  const intro = product.introPricePhase;
  const price = intro?.price ?? product.price;
  const period = intro?.price ? intro.period : product.period;
  const days = periodInDays(period);
  if (!price || !days || !Number.isFinite(price.amountMicros) || !/^[A-Z]{3}$/.test(price.currency)) return null;
  const amount = (price.amountMicros / 1_000_000) * (1 - discountPercent / 100) / days;
  return { amount, currency: price.currency };
}

/**
 * First charge as analytics value + currency: the paid intro price, else the
 * regular price. Ad platforms take only a value above 0 with an ISO 4217 code,
 * so a free intro phase counts the charge that follows it; empty when neither
 * price is usable.
 */
export function firstPaymentCommerce(product: Product | null | undefined): { value?: number; currency?: string } {
  for (const price of [product?.introPricePhase?.price, product?.price]) {
    if (price && Number.isFinite(price.amountMicros) && price.amountMicros > 0 && /^[A-Z]{3}$/.test(price.currency)) {
      return { value: price.amountMicros / 1_000_000, currency: price.currency };
    }
  }
  return {};
}

/**
 * The whole percent saved by paying `offerMicros` instead of `fullMicros`, rounded down so a
 * claim never rounds up past the real saving. 0 when there is no saving or a price is unusable.
 */
export function discountPercent(fullMicros: number, offerMicros: number): number {
  if (!(fullMicros > 0) || !(offerMicros >= 0) || offerMicros >= fullMicros) return 0;
  return Math.floor(((fullMicros - offerMicros) * 100) / fullMicros);
}

/**
 * What an offer may claim across plans: its largest real discount, "up to" when the plans differ,
 * including when a plan has no discount at all (then "every plan" would be false).
 */
export interface OfferClaim {
  percent: number;
  upTo: boolean;
}

export function offerClaim(percents: number[]): OfferClaim | null {
  const max = Math.max(0, ...percents);
  if (!(max > 0)) return null;
  return { percent: max, upTo: percents.some((percent) => percent !== max) };
}

export function formatPerDay(perDay: PlanPerDay | null, locale: string): string | null {
  if (!perDay) return null;
  const isVnd = perDay.currency === 'VND';
  // VND has no minor unit; round to the nearest 100 so "about" amounts look natural.
  const amount = isVnd ? Math.round(perDay.amount / 100) * 100 : perDay.amount;
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: perDay.currency,
    minimumFractionDigits: isVnd ? 0 : 2,
    maximumFractionDigits: isVnd ? 0 : 2,
  }).format(amount);
}

/**
 * Percent saved per day versus the most expensive plan per day (usually the shortest plan).
 * Plans below `minPercent`, the most expensive plan, and plans in a different currency are omitted.
 */
export function savingsVersusPriciest(perDayByPlan: Record<string, PlanPerDay | null>, minPercent = 5): Record<string, number> {
  const entries = Object.entries(perDayByPlan).filter((entry): entry is [string, PlanPerDay] => entry[1] !== null);
  const first = entries[0]?.[1];
  if (!first) return {};
  const comparable = entries.filter(([, value]) => value.currency === first.currency);
  const highest = Math.max(...comparable.map(([, value]) => value.amount));
  if (!(highest > 0)) return {};
  return Object.fromEntries(
    comparable.flatMap(([id, value]) => {
      const percent = Math.round((1 - value.amount / highest) * 100);
      return percent >= minPercent ? [[id, percent]] : [];
    }),
  );
}
