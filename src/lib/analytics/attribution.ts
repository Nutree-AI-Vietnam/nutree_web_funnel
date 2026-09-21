const STORAGE_KEY = 'nutree_attribution_v1';

const ATTRIBUTION_KEYS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
  'fbclid',
] as const;

export type AttributionKey = (typeof ATTRIBUTION_KEYS)[number];
export type Attribution = Partial<Record<AttributionKey, string>>;

function readStored(): Attribution {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return {};
    const next: Attribution = {};
    for (const key of ATTRIBUTION_KEYS) {
      const value = (parsed as Record<string, unknown>)[key];
      if (typeof value === 'string' && value.trim()) next[key] = value.trim().slice(0, 180);
    }
    return next;
  } catch {
    return {};
  }
}

function writeStored(attribution: Attribution): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(attribution));
  } catch {
    // Attribution is best-effort; never block the funnel.
  }
}

function fromSearch(search: string): Attribution {
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  const next: Attribution = {};
  for (const key of ATTRIBUTION_KEYS) {
    const value = params.get(key)?.trim();
    if (value) next[key] = value.slice(0, 180);
  }
  return next;
}

/**
 * First-touch UTMs for the tab, last-touch fbclid.
 * Call before the survey route strips `window.location.search`.
 */
export function captureAttribution(search = typeof window === 'undefined' ? '' : window.location.search): Attribution {
  const incoming = fromSearch(search);
  const stored = readStored();
  const merged: Attribution = { ...stored };

  for (const key of ATTRIBUTION_KEYS) {
    const incomingValue = incoming[key];
    if (!incomingValue) continue;
    if (key === 'fbclid' || !stored[key]) merged[key] = incomingValue;
  }

  writeStored(merged);
  return merged;
}

export function getAttribution(): Attribution {
  return readStored();
}
