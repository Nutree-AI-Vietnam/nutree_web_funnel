import type { Metadata } from 'next';
import { Be_Vietnam_Pro } from 'next/font/google';
import { AnalyticsScripts } from '@/components/analytics-scripts';
import { FunnelLocaleAnalytics } from '@/components/funnel-locale-analytics';
import { LocalPreviewTools } from '@/components/local-preview-tools';
import { MetaPixel } from '@/app/meta-pixel';
import { requestFunnelLocale } from '@/lib/analytics/request-funnel-locale';
import { rootMetadata } from '@/lib/funnel/survey-metadata';
import './globals.css';

const beVietnam = Be_Vietnam_Pro({
  subsets: ['latin', 'vietnamese'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-be-vietnam',
});

export async function generateMetadata(): Promise<Metadata> {
  return rootMetadata(await requestFunnelLocale());
}

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const locale = await requestFunnelLocale();
  return (
    <html lang={locale} className="h-full" data-funnel-locale={locale} data-scroll-behavior="smooth">
      <head>
        <MetaPixel locale={locale} />
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
