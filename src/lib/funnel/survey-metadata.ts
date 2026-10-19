import type { Metadata } from 'next';
import type { FunnelLocale } from '@/lib/analytics/funnel-locale';
import { copyFor, type Locale } from '@/lib/copy';
import { siteUrl } from '@/lib/site-url';

const OG_IMAGE = {
  url: '/nutree-logo-simple.png',
  width: 930,
  height: 834,
  alt: 'Nutree',
} as const;

const VI_DESCRIPTION = 'Trả lời vài câu để Nutree tính calo và macro cho bạn.';

/** Default document metadata. English survey routes use the English landing description. */
export function rootMetadata(locale: FunnelLocale): Metadata {
  const english = locale === 'en';
  const description = english ? copyFor('en').landing.metaDescription : VI_DESCRIPTION;
  return {
    metadataBase: new URL(siteUrl),
    applicationName: 'Nutree',
    title: {
      default: 'Nutree',
      template: '%s | Nutree',
    },
    description,
    openGraph: {
      title: 'Nutree',
      description,
      url: english ? '/survey/en' : '/',
      siteName: 'Nutree',
      locale: english ? 'en_US' : 'vi_VN',
      type: 'website',
      images: [OG_IMAGE],
    },
    twitter: {
      card: 'summary',
      title: 'Nutree',
      description,
      images: [OG_IMAGE.url],
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

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
