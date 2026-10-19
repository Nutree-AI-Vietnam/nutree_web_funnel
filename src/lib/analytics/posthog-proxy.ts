/** First-party path for PostHog ingestion. Kept off the obvious tracker names ad blockers match. */
export const POSTHOG_PROXY_PATH = '/nt-relay';

const ASSETS_HOST = 'us-assets.i.posthog.com';
const API_HOST = 'us.i.posthog.com';

export function posthogProxyTarget(pathname: string): { hostname: string; pathname: string } | null {
  if (pathname !== POSTHOG_PROXY_PATH && !pathname.startsWith(`${POSTHOG_PROXY_PATH}/`)) return null;
  const stripped = pathname.slice(POSTHOG_PROXY_PATH.length) || '/';
  const assets = stripped.startsWith('/static/') || stripped.startsWith('/array/');
  return { hostname: assets ? ASSETS_HOST : API_HOST, pathname: stripped };
}
