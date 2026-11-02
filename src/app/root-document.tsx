import { AnalyticsScripts } from '@/components/analytics-scripts';
import { FunnelLocaleAnalytics } from '@/components/funnel-locale-analytics';
import { MetaPixel } from '@/app/meta-pixel';
import type { FunnelLocale } from '@/lib/analytics/funnel-locale';

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
      <body className="flex min-h-full flex-col font-sans antialiased">
        <FunnelLocaleAnalytics />
        <AnalyticsScripts />
        {children}
      </body>
    </html>
  );
}
