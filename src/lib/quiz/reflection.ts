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

export function getGreetingName(name: string | undefined, copy: Copy): string {
  return name?.trim() || copy.reflection.fallbackName.toLowerCase();
}
