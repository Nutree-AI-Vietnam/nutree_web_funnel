import type { Copy } from '../copy';
import type { OnboardingPayload } from './types';

const label = (
  options: ReadonlyArray<{ readonly key: string; readonly label: string }>,
  key: string | undefined,
): string | undefined => options.find((o) => o.key === key)?.label;

/**
 * Fills the reflection template with the user's earlier answers (lowercased inline).
 * Copy is passed in so the sentence follows the active locale.
 */
export function buildReflection(data: OnboardingPayload, copy: Copy): string {
  const goal = label(copy.goal.options, data.fitness_goal)?.toLowerCase() ?? 'của bạn';
  const duration = label(copy.duration.options, data.challenge_duration)?.toLowerCase() ?? 'từng ngày';
  const challenges =
    (data.pain_points ?? [])
    .slice(0, 3)
    .map((k) => label(copy.challenges.options, k))
    .filter((v): v is string => Boolean(v))
      .join(', ')
      .toLowerCase() || 'thiếu một kế hoạch rõ ràng';

  return copy.reflection.template
    .replace('[name]', data.name || copy.reflection.fallbackName)
    .replace('[goal]', goal)
    .replace('[challenges]', challenges)
    .replace('[duration]', duration);
}

export function getGreetingName(name: string | undefined, copy: Copy): string {
  return name?.trim() || copy.reflection.fallbackName.toLowerCase();
}
