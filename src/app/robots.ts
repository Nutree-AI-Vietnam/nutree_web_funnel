import type { MetadataRoute } from 'next';

const siteUrl = 'https://start.nutree.ai';

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
