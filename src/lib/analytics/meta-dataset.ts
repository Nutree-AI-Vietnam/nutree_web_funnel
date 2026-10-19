/**
 * Server-only Conversions API credentials. Do not import this from client code:
 * it reads the access token.
 *
 * The browser sends a locale, never a pixel id. English uses the EN pixel and
 * token when those are set, and otherwise the default dataset.
 */
import type { FunnelLocale } from './funnel-locale';
import { metaPixelId, metaPixelIdForLocale } from './meta-identity';

function trimmed(value: string | undefined): string {
  return value?.trim() ?? '';
}

export function metaDatasetForLocale(locale: FunnelLocale): {
  pixelId: string;
  accessToken: string;
  testEventCode?: string;
} {
  const pixelId = metaPixelIdForLocale(locale);
  const defaultToken = trimmed(process.env.META_CONVERSIONS_API_ACCESS_TOKEN);
  const defaultTest = trimmed(process.env.META_CONVERSIONS_API_TEST_EVENT_CODE) || undefined;
  if (locale !== 'en') return { pixelId, accessToken: defaultToken, testEventCode: defaultTest };
  const englishPixel = metaPixelId(process.env.NEXT_PUBLIC_META_PIXEL_ID_EN);
  const englishToken = trimmed(process.env.META_CONVERSIONS_API_ACCESS_TOKEN_EN);
  return {
    pixelId,
    accessToken: englishToken || defaultToken,
    // A test code belongs to one dataset. The default code is only used when English fell back to it.
    testEventCode: englishPixel ? trimmed(process.env.META_CONVERSIONS_API_TEST_EVENT_CODE_EN) || undefined : defaultTest,
  };
}
