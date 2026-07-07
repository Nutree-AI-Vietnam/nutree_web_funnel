import { vi } from '../copy/vi';
import type { OnboardingPayload } from './types';

const label = (
  options: ReadonlyArray<{ readonly key: string; readonly label: string }>,
  key: string | undefined,
): string | undefined => options.find((o) => o.key === key)?.label;

/** Fills the reflection template with the user's earlier answers (lowercased inline). */
export function buildReflection(data: OnboardingPayload): string {
  const goal = label(vi.goal.options, data.fitness_goal) ?? '';
  const duration = label(vi.duration.options, data.challenge_duration) ?? '';
  const challenges = (data.pain_points ?? [])
    .slice(0, 3)
    .map((k) => label(vi.challenges.options, k))
    .filter((v): v is string => Boolean(v))
    .join(', ');

  return vi.reflection.template
    .replace('[name]', data.name || vi.reflection.fallbackName)
    .replace('[goal]', goal.toLowerCase())
    .replace('[challenges]', challenges.toLowerCase())
    .replace('[duration]', duration.toLowerCase());
}
