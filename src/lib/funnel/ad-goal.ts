import type { OnboardingPayload } from '@/lib/quiz/types';

type Goal = NonNullable<OnboardingPayload['fitness_goal']>;

/** Goal names an ad link may carry in `?goal=`, so the goal question can be skipped. */
const GOAL_ALIASES: Record<string, Goal> = {
  cut: 'cut',
  lose_weight: 'cut',
  lose_fat: 'cut',
  weight_loss: 'cut',
  bulk: 'bulk',
  build_muscle: 'bulk',
  gain_weight: 'bulk',
  recomp: 'recomp',
  maintain: 'maintain',
  eat_healthier: 'maintain',
};

export function goalFromSearch(search: string): Goal | null {
  const value = new URLSearchParams(search).get('goal')?.trim().toLowerCase();
  return value ? GOAL_ALIASES[value] ?? null : null;
}
