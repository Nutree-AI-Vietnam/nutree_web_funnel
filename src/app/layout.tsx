import type { Metadata } from 'next';
import { Be_Vietnam_Pro } from 'next/font/google';
import { AnalyticsScripts } from '@/components/analytics-scripts';
import { LocalPreviewTools } from '@/components/local-preview-tools';
import './globals.css';

const beVietnam = Be_Vietnam_Pro({
  subsets: ['latin', 'vietnamese'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-be-vietnam',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://start.nutree.ai'),
  applicationName: 'Nutree',
  title: {
    default: 'Nutree - Kế hoạch dinh dưỡng cá nhân hóa',
    template: '%s | Nutree',
  },
  description:
    'Trả lời vài câu hỏi để nhận kế hoạch calo & macro dựa trên khoa học, thiết kế riêng cho bạn.',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'Nutree - Kế hoạch dinh dưỡng cá nhân hóa',
    description:
      'Trả lời vài câu hỏi để nhận kế hoạch calo & macro dựa trên khoa học, thiết kế riêng cho bạn.',
    url: '/',
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
      <body className={`${beVietnam.variable} flex min-h-full flex-col font-sans antialiased`}>
        <AnalyticsScripts />
        {children}
        <LocalPreviewTools />
      </body>
    </html>
  );
}
