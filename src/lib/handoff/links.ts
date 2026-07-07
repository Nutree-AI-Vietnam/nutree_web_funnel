/**
 * Airbridge tracking link + claim token as the deferred deep link. The app's
 * Airbridge SDK surfaces nutree://claim?token=... on first launch; the app
 * then calls the claim endpoint.
 */
export function buildDownloadLink(claimToken: string): string {
  const base = process.env.NEXT_PUBLIC_AIRBRIDGE_TRACKING_LINK;
  if (!base) throw new Error('NEXT_PUBLIC_AIRBRIDGE_TRACKING_LINK is not set');
  const url = new URL(base);
  url.searchParams.set('deeplink_url', `nutree://claim?token=${claimToken}`);
  return url.toString();
}
