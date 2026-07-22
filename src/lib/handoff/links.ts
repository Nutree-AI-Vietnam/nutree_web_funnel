/**
 * Airbridge tracking link + claim token as the deferred deep link. The app's
 * Airbridge SDK surfaces nutree://claim?token=... on first launch; the app
 * then calls the claim endpoint.
 */
export function buildDownloadLink(claimToken: string): string {
  const base =
    process.env.NEXT_PUBLIC_AIRBRIDGE_TRACKING_LINK ||
    process.env.NEXT_PUBLIC_APPSTORE_URL ||
    process.env.NEXT_PUBLIC_PLAYSTORE_URL ||
    '/';
  const origin = typeof window === 'undefined' ? 'https://start.nutree.ai' : window.location.origin;
  const url = new URL(base, origin);
  url.searchParams.set('deeplink_url', `nutree://claim?token=${claimToken}`);
  return url.toString();
}
