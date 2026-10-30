import type { Copy } from '../copy';
import type { OnboardingPayload } from './types';

type ChallengeKey = keyof Copy['reflection']['fixes'];

const isChallengeKey = (key: string, copy: Copy): key is ChallengeKey => Object.hasOwn(copy.reflection.fixes, key);

/**
 * The reflection headline, picked by the motivation answer. The name goes in front when
 * given; otherwise the phrase stands alone with a capital first letter.
 * Copy is passed in so the sentence follows the active locale.
 */
export function reflectionHeadline(data: OnboardingPayload, copy: Copy): string {
  const phrase = copy.reflection.headline[data.motivation ?? 'fallback'] ?? copy.reflection.headline.fallback;
  const name = data.name?.trim();
  return name ? `${name}, ${phrase}` : phrase.charAt(0).toUpperCase() + phrase.slice(1);
}

/**
 * Up to three "you said → your plan does" rows, one per challenge in pick order.
 * Keys with no label or fix (stale or unknown answers) are skipped.
 */
export function reflectionRows(data: OnboardingPayload, copy: Copy): { key: string; label: string; fix: string }[] {
  return (data.pain_points ?? [])
    .flatMap((key) => {
      const label = copy.challenges.options.find((o) => o.key === key)?.label;
      return label && isChallengeKey(key, copy) ? [{ key, label, fix: copy.reflection.fixes[key] }] : [];
    })
    .slice(0, 3);
}

/**
 * What the summary reflection reads back: the goal, the first challenge picked on 04 and the reason
 * picked on 06, each with a fallback so a skipped answer never leaves a tile empty.
 */
export function reflectionSummary(data: OnboardingPayload, copy: Copy): { name: string; goal: string; challenge: string; reason: string } {
  const text = copy.reflection.summary;
  const label = (options: readonly { key: string; label: string }[], key: string | undefined) => options.find((o) => o.key === key)?.label;
  return {
    name: data.name?.trim() || copy.reflection.fallbackName,
    goal: label(copy.goal.options, data.fitness_goal) ?? text.goalFallback,
    challenge: (data.pain_points ?? []).map((key) => label(copy.challenges.options, key)).find(Boolean) ?? text.challengeFallback,
    reason: label(copy.motivation.options, data.motivation) ?? text.reasonFallback,
  };
}

export function getGreetingName(name: string | undefined, copy: Copy): string {
  return name?.trim() || copy.reflection.fallbackName.toLowerCase();
}
