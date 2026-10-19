import { Be_Vietnam_Pro } from 'next/font/google';
import { AnalyticsScripts } from '@/components/analytics-scripts';
import { FunnelLocaleAnalytics } from '@/components/funnel-locale-analytics';
import { LocalPreviewTools } from '@/components/local-preview-tools';
import { MetaPixel } from '@/app/meta-pixel';
import type { FunnelLocale } from '@/lib/analytics/funnel-locale';

const beVietnam = Be_Vietnam_Pro({
  subsets: ['latin', 'vietnamese'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-be-vietnam',
});

/**
 * Shared document shell. Each route group has its own root layout and passes
 * the locale and the one pixel id for that document. Callers must not read
 * request headers here.
 */
export function RootDocument({
  locale,
  pixelId,
  children,
}: {
  locale: FunnelLocale;
  pixelId: string;
  children: React.ReactNode;
}) {
  return (
    <html
      lang={locale}
      className="h-full"
      data-funnel-locale={locale}
      data-meta-pixel-id={pixelId || undefined}
      data-scroll-behavior="smooth"
    >
      <head>
        <MetaPixel pixelId={pixelId} />
      </head>
      <body className={`${beVietnam.variable} flex min-h-full flex-col font-sans antialiased`}>
        <FunnelLocaleAnalytics />
        <AnalyticsScripts />
        {children}
        <LocalPreviewTools />
      </body>
    </html>
  );
}
