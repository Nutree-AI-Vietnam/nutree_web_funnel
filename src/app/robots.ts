import type { MetadataRoute } from 'next';
import { siteUrl } from '@/lib/site-url';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/quiz/', '/email', '/paywall', '/success', '/momo/'],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
