/**
 * Server-only Conversions API credentials. Do not import this from client code:
 * it reads the access token.
 *
 * The browser sends a locale, never a pixel id. English is used only when its
 * pixel id and token are both set. A partial pair falls back to the Vietnamese
 * pixel and token together, so one dataset never receives the other's token.
 */
import 'server-only';
import type { FunnelLocale } from './funnel-locale';
import { metaPixelId } from './meta-identity';

function trimmed(value: string | undefined): string {
  return value?.trim() ?? '';
}

export interface MetaDataset {
  pixelId: string;
  accessToken: string;
}

function vietnameseDataset(): MetaDataset {
  return {
    pixelId: metaPixelId(),
    accessToken: trimmed(process.env.META_CONVERSIONS_API_ACCESS_TOKEN),
  };
}

export function metaDatasetForLocale(locale: FunnelLocale): MetaDataset {
  const vietnamese = vietnameseDataset();
  if (locale !== 'en') return vietnamese;
  const englishPixel = metaPixelId(process.env.NEXT_PUBLIC_META_PIXEL_ID_EN);
  const englishToken = trimmed(process.env.META_CONVERSIONS_API_ACCESS_TOKEN_EN);
  if (englishPixel && englishToken) return { pixelId: englishPixel, accessToken: englishToken };
  if (englishPixel || englishToken) {
    console.warn('English Meta pixel and token must both be set; using the Vietnamese dataset.', {
      pixel: englishPixel ? 'set' : 'missing',
      token: englishToken ? 'set' : 'missing',
    });
  }
  return vietnamese;
}
