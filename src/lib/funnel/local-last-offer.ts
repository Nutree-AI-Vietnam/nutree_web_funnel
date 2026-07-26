import type { FunnelOffer } from '@/lib/quiz/types';

export function previewAmountDueToday(offer: FunnelOffer, rewardPercent: number) {
  if (rewardPercent !== 75 || !offer.recommended) return offer.amount_due_today;

  const amount = offer.welcome_amount / 2;
  if (offer.currency === 'VND') return Math.floor(amount / 1000) * 1000;
  return Math.floor(amount * 100) / 100;
}
