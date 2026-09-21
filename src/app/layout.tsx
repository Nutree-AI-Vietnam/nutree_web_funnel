import type { Metadata } from 'next';
import { Be_Vietnam_Pro } from 'next/font/google';
import Script from 'next/script';
import { AnalyticsScripts } from '@/components/analytics-scripts';
import { LocalPreviewTools } from '@/components/local-preview-tools';
import { siteUrl } from '@/lib/site-url';
import './globals.css';

const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID?.replace(/\D/g, '') ?? '';

const beVietnam = Be_Vietnam_Pro({
  subsets: ['latin', 'vietnamese'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-be-vietnam',
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: 'Nutree',
  title: {
    default: 'Nutree - Kế hoạch dinh dưỡng cá nhân hóa',
    template: '%s | Nutree',
  },
  description:
    'Trả lời vài câu hỏi để nhận kế hoạch calo & macro dựa trên khoa học, thiết kế riêng cho bạn.',
  alternates: {
    canonical: '/survey/vi',
  },
  openGraph: {
    title: 'Nutree - Kế hoạch dinh dưỡng cá nhân hóa',
    description:
      'Trả lời vài câu hỏi để nhận kế hoạch calo & macro dựa trên khoa học, thiết kế riêng cho bạn.',
    url: '/survey/vi',
    siteName: 'Nutree',
    locale: 'vi_VN',
    type: 'website',
    images: [
      {
        url: '/nutree-logo-simple.png',
        width: 156,
        height: 60,
        alt: 'Nutree',
      },
    ],
  },
  twitter: {
    card: 'summary',
    title: 'Nutree - Kế hoạch dinh dưỡng cá nhân hóa',
    description:
      'Trả lời vài câu hỏi để nhận kế hoạch calo & macro dựa trên khoa học, thiết kế riêng cho bạn.',
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
              {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init','${META_PIXEL_ID}');fbq('track','PageView');`}
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
