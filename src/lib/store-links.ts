const productionAppStoreUrl = 'https://apps.apple.com/app/id6751159552';
const productionPlayStoreUrl =
  'https://play.google.com/store/apps/details?id=com.nutreeai.mobile';

function httpsUrl(value: string | undefined): URL | null {
  if (!value || !URL.canParse(value)) return null;
  const url = new URL(value);
  return url.protocol === 'https:' ? url : null;
}

/** Public App Store listing. Ignores placeholders and non-store values. */
export function appStoreUrl(configured = process.env.NEXT_PUBLIC_APPSTORE_URL): string {
  const url = httpsUrl(configured);
  if (!url || url.hostname !== 'apps.apple.com') return productionAppStoreUrl;
  return url.toString();
}

/**
 * Public production Play listing.
 * Staging package ids and template placeholders must not ship on the install buttons.
 */
const productionPlayPackageId = 'com.nutreeai.mobile';

export type PhoneStore = 'android' | 'ios';

/** Which install button should lead, from the browser that opened the handoff page. */
export function phoneStoreFromUserAgent(userAgent: string | null | undefined): PhoneStore | null {
  const agent = userAgent ?? '';
  if (/android/i.test(agent)) return 'android';
  if (/iPad|iPhone|iPod/i.test(agent)) return 'ios';
  return null;
}

export function orderedStoreLinks(platform: PhoneStore | null): Array<{
  href: string;
  label: 'Google Play' | 'App Store';
  primary: boolean;
}> {
  const play = { href: playStoreUrl(), label: 'Google Play' as const };
  const apple = { href: appStoreUrl(), label: 'App Store' as const };
  const [first, second] = platform === 'android' ? [play, apple] : [apple, play];
  return [
    { ...first, primary: true },
    { ...second, primary: false },
  ];
}

export function playStoreUrl(configured = process.env.NEXT_PUBLIC_PLAYSTORE_URL): string {
  const url = httpsUrl(configured);
  const packageId = url?.searchParams.get('id') ?? '';
  if (
    !url ||
    url.hostname !== 'play.google.com' ||
    packageId !== productionPlayPackageId
  ) {
    return productionPlayStoreUrl;
  }
  return url.toString();
}
