import type { Metadata } from 'next';
import { Be_Vietnam_Pro } from 'next/font/google';
import './globals.css';

const beVietnam = Be_Vietnam_Pro({
  subsets: ['latin', 'vietnamese'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-be-vietnam',
});

export const metadata: Metadata = {
  title: 'Nutree — Kế hoạch dinh dưỡng cá nhân hóa',
  description:
    'Trả lời vài câu hỏi để nhận kế hoạch calo & macro dựa trên khoa học, thiết kế riêng cho bạn.',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi" className="h-full">
      <body className={`${beVietnam.variable} flex min-h-full flex-col font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
