const STORAGE_KEY = 'nutree_attribution_v1';
const MAX_VALUE_LENGTH = 180;

/** Campaign tags: the first touch in this tab wins. */
const CAMPAIGN_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'utm_id'] as const;

/** Ad-platform click IDs: the latest click wins so a fresh click still matches its ad. */
const CLICK_ID_KEYS = ['fbclid', 'gclid', 'gbraid', 'wbraid', 'ttclid'] as const;

export const ATTRIBUTION_KEYS = [...CAMPAIGN_KEYS, ...CLICK_ID_KEYS] as const;

export type AttributionKey = (typeof ATTRIBUTION_KEYS)[number];
export type Attribution = Partial<Record<AttributionKey, string>>;

export function isAttributionKey(key: string): key is AttributionKey {
  return (ATTRIBUTION_KEYS as readonly string[]).includes(key);
}

function isClickId(key: AttributionKey): boolean {
  return (CLICK_ID_KEYS as readonly string[]).includes(key);
}

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
      if (typeof value === 'string' && value.trim()) next[key] = value.trim().slice(0, MAX_VALUE_LENGTH);
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
  const params = new URLSearchParams(search);
  const next: Attribution = {};
  for (const key of ATTRIBUTION_KEYS) {
    const value = params.get(key)?.trim();
    if (value) next[key] = value.slice(0, MAX_VALUE_LENGTH);
  }
  return next;
}

/**
 * First-touch campaign tags for the tab, last-touch click IDs.
 * Call on mount of any entry route, before the URL is rewritten.
 */
export function captureAttribution(search = typeof window === 'undefined' ? '' : window.location.search): Attribution {
  const incoming = fromSearch(search);
  const stored = readStored();
  const merged: Attribution = { ...stored };

  for (const key of ATTRIBUTION_KEYS) {
    const incomingValue = incoming[key];
    if (!incomingValue) continue;
    if (isClickId(key) || !stored[key]) merged[key] = incomingValue;
  }

  writeStored(merged);
  return merged;
}

export function getAttribution(): Attribution {
  return readStored();
}

/**
 * Drops every non-attribution query parameter from the current URL and leaves the
 * UTM and click-ID ones in place. GA4, TikTok, and Airbridge load after hydration
 * and read campaign data from the URL, so removing UTMs on mount would attribute
 * the session to direct traffic.
 */
export function stripNonAttributionParams(): void {
  if (typeof window === 'undefined' || !window.location.search) return;
  const params = new URLSearchParams(window.location.search);
  const dropped = [...params.keys()].filter((key) => !isAttributionKey(key));
  if (!dropped.length) return;
  for (const key of dropped) params.delete(key);
  const search = params.toString();
  window.history.replaceState(
    window.history.state,
    '',
    `${window.location.pathname}${search ? `?${search}` : ''}${window.location.hash}`,
  );
}
