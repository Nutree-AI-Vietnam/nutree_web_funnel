import type { MetadataRoute } from 'next';
import { siteUrl } from '@/lib/site-url';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/quiz', '/email', '/welcome', '/welcome-gift', '/exit-offer', '/paywall', '/checkout', '/success', '/postcheckout', '/momo/', '/auth/', '/redeem', '/open-nutree'],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
