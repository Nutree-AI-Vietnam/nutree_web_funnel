import type { Metadata } from 'next';
import { copyFor, type Locale } from '@/lib/copy';

const OG_IMAGE = {
  url: '/nutree-logo-simple.png',
  width: 930,
  height: 834,
  alt: 'Nutree',
} as const;

/** Title, description, and preview image for the quiz. Matches the visible landing copy. */
export function surveyMetadata(locale: Locale, path: string): Metadata {
  const landing = copyFor(locale).landing;
  return {
    title: { absolute: landing.metaTitle },
    description: landing.metaDescription,
    alternates: { canonical: path },
    openGraph: {
      title: landing.metaTitle,
      description: landing.metaDescription,
      url: path,
      siteName: 'Nutree',
      locale: locale === 'vi' ? 'vi_VN' : 'en_US',
      type: 'website',
      images: [OG_IMAGE],
    },
    twitter: {
      card: 'summary',
      title: landing.metaTitle,
      description: landing.metaDescription,
      images: [OG_IMAGE.url],
    },
  };
}
