import type { Metadata } from 'next';
import { Be_Vietnam_Pro } from 'next/font/google';
import Script from 'next/script';
import { AnalyticsScripts } from '@/components/analytics-scripts';
import { LocalPreviewTools } from '@/components/local-preview-tools';
import { metaPixelId } from '@/lib/analytics/meta-identity';
import { metaPixelBootstrapScript } from '@/lib/analytics/meta-pixel-snippet';
import { siteUrl } from '@/lib/site-url';
import './globals.css';

const META_PIXEL_ID = metaPixelId();

const beVietnam = Be_Vietnam_Pro({
  subsets: ['latin', 'vietnamese'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-be-vietnam',
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: 'Nutree',
  title: {
    default: 'Quiz dinh dưỡng Nutree',
    template: '%s | Nutree',
  },
  description:
    'Làm bài quiz Nutree để tính calo và macro.',
  openGraph: {
    title: 'Quiz dinh dưỡng Nutree',
    description:
      'Làm bài quiz Nutree để tính calo và macro.',
    url: '/',
    siteName: 'Nutree',
    locale: 'vi_VN',
    type: 'website',
    images: [
      {
        url: '/nutree-logo-simple.png',
        width: 930,
        height: 834,
        alt: 'Nutree',
      },
    ],
  },
  twitter: {
    card: 'summary',
    title: 'Quiz dinh dưỡng Nutree',
    description:
      'Làm bài quiz Nutree để tính calo và macro.',
    images: ['/nutree-logo-simple.png'],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi" className="h-full" data-scroll-behavior="smooth">
      <head>
        {META_PIXEL_ID ? (
          <>
            <Script id="meta-pixel" strategy="beforeInteractive">
              {metaPixelBootstrapScript(META_PIXEL_ID)}
            </Script>
            <noscript>
              <img
                height={1}
                width={1}
                style={{ display: 'none' }}
                src={`https://www.facebook.com/tr?id=${META_PIXEL_ID}&ev=PageView&noscript=1`}
                alt=""
              />
            </noscript>
          </>
        ) : null}
      </head>
      <body className={`${beVietnam.variable} flex min-h-full flex-col font-sans antialiased`}>
        <AnalyticsScripts />
        {children}
        <LocalPreviewTools />
      </body>
    </html>
  );
}
