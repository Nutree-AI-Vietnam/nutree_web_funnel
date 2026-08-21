import type { MetadataRoute } from 'next';
import { siteUrl } from '@/lib/site-url';

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return (['vi', 'en'] as const).map((language) => ({
    url: `${siteUrl}/survey/${language}`,
    lastModified,
    changeFrequency: 'weekly' as const,
    priority: 1,
  }));
}
